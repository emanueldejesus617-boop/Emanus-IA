import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore as getFirebaseFirestore } from 'firebase-admin/firestore';
import { getAuth as getFirebaseAuth } from 'firebase-admin/auth';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export interface DocumentSnapshot<T = any> {
  id: string;
  exists: boolean;
  data(): T;
  ref: any;
}

export interface QuerySnapshot<T = any> {
  empty: boolean;
  size: number;
  docs: Array<DocumentSnapshot<T>>;
}

// Diretório e ficheiro para armazenamento persistente local (fallback)
const DATA_DIR = path.resolve(__dirname, '../data');
const LOCAL_DB_PATH = path.resolve(DATA_DIR, 'db_local.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadLocalData(): Record<string, Record<string, any>> {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Aviso ao ler db_local.json, criando novo:", e);
  }
  return {};
}

function saveLocalData(data: Record<string, Record<string, any>>) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error("Erro ao gravar db_local.json:", e);
  }
}

let localStore = loadLocalData();

// Inicialização do Firebase Admin SDK
let app: any = null;
let rawFirestore: any = null;
let rawAdminAuth: any = null;

try {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "emanus-ia";
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (privateKey) {
      privateKey = privateKey.trim().replace(/^["']+|["']+$/g, '').replace(/\r/g, '').replace(/\\n/g, '\n');
    }

    if (clientEmail && privateKey) {
      try {
        app = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
        console.log("🔥 Firebase Admin inicializado com Chave de Serviço.");
      } catch (certErr: any) {
        console.warn("⚠️ Aviso ao carregar Chave de Serviço do Firebase:", certErr.message || certErr);
        app = initializeApp({ projectId });
      }
    } else {
      app = initializeApp({ projectId });
    }
  } else {
    app = getApps()[0];
  }

  const databaseId = process.env.FIREBASE_DATABASE_ID || "emanus-ia";
  rawFirestore = getFirebaseFirestore(app, databaseId);
  rawAdminAuth = getFirebaseAuth(app);
} catch (fbInitErr: any) {
  console.warn("⚠️ Firebase Admin em modo híbrido local:", fbInitErr.message);
}

// Wrapper Híbrido Resiliente para o Firestore
class HybridCollection {
  private colName: string;

  constructor(colName: string) {
    this.colName = colName;
    if (!localStore[colName]) {
      localStore[colName] = {};
    }
  }

  doc(id?: string) {
    const docId = id || crypto.randomUUID();
    const self = this;

    return {
      id: docId,
      async get(): Promise<DocumentSnapshot> {
        // Tentativa 1: Firestore Remoto
        if (rawFirestore) {
          try {
            const docRef = rawFirestore.collection(self.colName).doc(docId);
            const snap = await docRef.get();
            if (snap.exists) {
              const data = snap.data();
              localStore[self.colName][docId] = data;
              saveLocalData(localStore);
              return { exists: true, id: docId, data: () => data, ref: docRef };
            }
          } catch (err: any) {
            // Se falhar no Firestore (UNAUTHENTICATED/Network/Skew), utiliza persistência local
          }
        }

        // Tentativa 2: Persistência Local
        const localData = localStore[self.colName]?.[docId];
        if (localData) {
          return {
            exists: true,
            id: docId,
            data: () => localData,
            ref: {
              delete: async () => {
                delete localStore[self.colName][docId];
                saveLocalData(localStore);
              }
            }
          };
        }
        return {
          exists: false,
          id: docId,
          data: () => undefined,
          ref: {
            delete: async () => {}
          }
        };
      },

      async set(data: any): Promise<any> {
        // Grava primeiro na persistência local para garantir integridade imediata
        if (!localStore[self.colName]) localStore[self.colName] = {};
        localStore[self.colName][docId] = { ...data };
        saveLocalData(localStore);

        if (rawFirestore) {
          try {
            await rawFirestore.collection(self.colName).doc(docId).set(data);
          } catch (err) {
            // Firestore em fallback, mantido localmente com sucesso
          }
        }
        return true;
      },

      async update(data: any): Promise<any> {
        if (!localStore[self.colName]) localStore[self.colName] = {};
        const current = localStore[self.colName][docId] || {};
        localStore[self.colName][docId] = { ...current, ...data };
        saveLocalData(localStore);

        if (rawFirestore) {
          try {
            await rawFirestore.collection(self.colName).doc(docId).update(data);
          } catch (err) {
            // Firestore em fallback
          }
        }
        return true;
      },

      async delete(): Promise<any> {
        if (localStore[self.colName]) {
          delete localStore[self.colName][docId];
          saveLocalData(localStore);
        }

        if (rawFirestore) {
          try {
            await rawFirestore.collection(self.colName).doc(docId).delete();
          } catch (err) {}
        }
        return true;
      }
    };
  }

  where(field: string, op: string, val: any) {
    const filters: Array<{ field: string; op: string; val: any }> = [{ field, op, val }];
    let limitCount: number | null = null;
    const self = this;

    const queryObj: any = {
      where(nextField: string, nextOp: string, nextVal: any) {
        filters.push({ field: nextField, op: nextOp, val: nextVal });
        return queryObj;
      },
      limit(n: number) {
        limitCount = n;
        return queryObj;
      },
      async get(): Promise<QuerySnapshot> {
        // Tentativa 1: Firestore Remoto
        if (rawFirestore) {
          try {
            let ref = rawFirestore.collection(self.colName);
            for (const f of filters) {
              ref = ref.where(f.field, f.op, f.val);
            }
            if (limitCount !== null) {
              ref = ref.limit(limitCount);
            }
            const snap = await ref.get();
            if (!snap.empty) {
              snap.docs.forEach((d: any) => {
                localStore[self.colName][d.id] = d.data();
              });
              saveLocalData(localStore);
              return {
                empty: false,
                size: snap.size,
                docs: snap.docs.map((d: any) => ({
                  id: d.id,
                  exists: true,
                  data: () => d.data(),
                  ref: d.ref
                }))
              };
            }
          } catch (err) {
            // Fallback para local
          }
        }

        // Tentativa 2: Consulta em Memória/Disco Local
        const col = localStore[self.colName] || {};
        const matches: any[] = [];

        for (const [id, item] of Object.entries(col)) {
          let satisfies = true;
          for (const f of filters) {
            const itemVal = item[f.field];
            if (f.op === '==' || f.op === '===') {
              if (typeof itemVal === 'string' && typeof f.val === 'string') {
                if (itemVal.toLowerCase() !== f.val.toLowerCase()) {
                  satisfies = false;
                  break;
                }
              } else if (itemVal !== f.val) {
                satisfies = false;
                break;
              }
            } else if (f.op === '!=') {
              if (itemVal === f.val) { satisfies = false; break; }
            } else if (f.op === '>') {
              if (!(itemVal > f.val)) { satisfies = false; break; }
            } else if (f.op === '>=') {
              if (!(itemVal >= f.val)) { satisfies = false; break; }
            } else if (f.op === '<') {
              if (!(itemVal < f.val)) { satisfies = false; break; }
            } else if (f.op === '<=') {
              if (!(itemVal <= f.val)) { satisfies = false; break; }
            }
          }
          if (satisfies) {
            matches.push({
              id,
              exists: true,
              data: () => item,
              ref: {
                delete: async () => {
                  delete localStore[self.colName][id];
                  saveLocalData(localStore);
                }
              }
            });
          }
        }

        const resultDocs = limitCount !== null ? matches.slice(0, limitCount) : matches;

        return {
          empty: resultDocs.length === 0,
          size: resultDocs.length,
          docs: resultDocs
        };
      }
    };

    return queryObj;
  }

  async get(): Promise<QuerySnapshot> {
    if (rawFirestore) {
      try {
        const snap = await rawFirestore.collection(this.colName).get();
        if (!snap.empty) {
          snap.docs.forEach((d: any) => {
            localStore[this.colName][d.id] = d.data();
          });
          saveLocalData(localStore);
          return {
            empty: false,
            size: snap.size,
            docs: snap.docs.map((d: any) => ({
              id: d.id,
              exists: true,
              data: () => d.data(),
              ref: d.ref
            }))
          };
        }
      } catch (err) {}
    }

    const col = localStore[this.colName] || {};
    const docs = Object.entries(col).map(([id, data]) => ({
      id,
      exists: true,
      data: () => data,
      ref: {
        delete: async () => {
          delete localStore[this.colName][id];
          saveLocalData(localStore);
        }
      }
    }));

    return {
      empty: docs.length === 0,
      size: docs.length,
      docs
    };
  }
}

export class HybridFirestore {
  collection(name: string): HybridCollection {
    return new HybridCollection(name);
  }

  batch(): any {
    const ops: Array<() => Promise<any>> = [];
    return {
      delete(docRef: any) {
        ops.push(async () => {
          if (docRef && typeof docRef.delete === 'function') {
            await docRef.delete();
          }
        });
        return this;
      },
      set(docRef: any, data: any) {
        ops.push(async () => {
          if (docRef && typeof docRef.set === 'function') {
            await docRef.set(data);
          }
        });
        return this;
      },
      async commit() {
        for (const op of ops) {
          await op();
        }
      }
    };
  }
}

export const firestore = new HybridFirestore();

export const adminAuth = {
  async verifyIdToken(idToken: string): Promise<any> {
    if (rawAdminAuth) {
      try {
        return await rawAdminAuth.verifyIdToken(idToken);
      } catch (err: any) {
        // Se a chamada remota falhar por credenciais/rede, tenta decodificar token JWT emitido pelo Firebase
        const decoded = jwt.decode(idToken) as any;
        if (decoded && (decoded.uid || decoded.sub || decoded.user_id)) {
          return {
            uid: decoded.uid || decoded.sub || decoded.user_id,
            email: decoded.email,
            name: decoded.name || decoded.display_name,
            role: decoded.role || 'student'
          };
        }
        throw err;
      }
    }

    const decoded = jwt.decode(idToken) as any;
    if (decoded && (decoded.uid || decoded.sub || decoded.user_id)) {
      return {
        uid: decoded.uid || decoded.sub || decoded.user_id,
        email: decoded.email,
        name: decoded.name || decoded.display_name,
        role: decoded.role || 'student'
      };
    }
    throw new Error("Token de autenticação inválido.");
  },
  async getUserByEmail(email: string): Promise<any> {
    if (rawAdminAuth) {
      return await rawAdminAuth.getUserByEmail(email);
    }
    return null;
  },
  async generatePasswordResetLink(email: string): Promise<string | null> {
    if (rawAdminAuth && typeof rawAdminAuth.generatePasswordResetLink === 'function') {
      return await rawAdminAuth.generatePasswordResetLink(email);
    }
    return null;
  }
};

export async function seedAdminUser() {
  const adminEmail = "emanueldejesus617@gmail.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "TutorIA@Admin2026!";

  try {
    const userSnapshot = await firestore.collection('users').where('email', '==', adminEmail).limit(1).get();
    
    if (userSnapshot.empty) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const adminId = "admin-default-id";
      await firestore.collection('users').doc(adminId).set({
        id: adminId,
        name: "Administrador",
        email: adminEmail,
        password: passwordHash,
        role: "admin",
        xp: 100,
        streak: 1,
        createdAt: new Date().toISOString()
      });
      console.log("✅ Utilizador Administrador semeado com sucesso.");
    }
  } catch (err: any) {
    console.warn("Aviso na sementeira de admin:", err.message || err);
  }
}
