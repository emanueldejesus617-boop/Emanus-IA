import path from 'path';
import fs from 'fs';
import os from 'os';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore as getFirebaseFirestore } from 'firebase-admin/firestore';
import { getAuth as getFirebaseAuth } from 'firebase-admin/auth';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import initialLocalDb from '../data/db_local.json';

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

// Timeout helper para garantir que chamadas de rede ao Firestore nunca bloqueiem o Serverless Function
export function withTimeout<T = any>(promise: Promise<T> | any, ms = 12000): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Timeout de conexão ao Firestore")), ms);
  });
  return Promise.race([
    Promise.resolve(promise).finally(() => {
      if (timer) clearTimeout(timer);
    }),
    timeoutPromise,
  ]);
}

// Diretório e ficheiro para armazenamento persistente local (fallback)
const DATA_DIR = process.env.VERCEL ? os.tmpdir() : path.resolve(process.cwd(), 'data');
const LOCAL_DB_PATH = path.resolve(DATA_DIR, 'db_local.json');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  // Ignora se não puder criar diretório
}

function loadLocalData(): Record<string, Record<string, any>> {
  let data: Record<string, Record<string, any>> = {};
  if (initialLocalDb && typeof initialLocalDb === 'object') {
    data = JSON.parse(JSON.stringify(initialLocalDb));
  }
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
      const diskData = JSON.parse(raw);
      data = { ...data, ...diskData };
    }
  } catch (e) {
    // Silencioso em fallback
  }
  return data;
}

function saveLocalData(data: Record<string, Record<string, any>>) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    // Silencioso em Vercel se /tmp tiver restrição
  }
}

const localStore = loadLocalData();

// Credenciais padrão do Firebase Admin (Chave de Serviço da Emanus IA)
const DEFAULT_FIREBASE_PROJECT_ID = "emanus-ia";
const DEFAULT_FIREBASE_DATABASE_ID = "emanus-ia";
const DEFAULT_FIREBASE_CLIENT_EMAIL = "firebase-adminsdk-fbsvc@emanus-ia.iam.gserviceaccount.com";
const DEFAULT_FIREBASE_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDzaCKcTqCY/BS/
2/aucJ/01VKN2ynY43BC7j/qXD/SpAPe1a4Q/hWzeZd8HuJyEKcgP9NljMvGaO0/
UOp5+Kx4VyETR9PWpnVNKV4oS9Kbt84nu/5wLubJbuOOo2qG0jq2qD0D5uz5v0x9
LB0iuPlxM+icBAL5jxLSG3THjmYAOaCeZ1P0GyD2wTQ++OPvE4VciOGwp3eCn73o
EZVw0E3lRzU1Qn3sIen5+fbmEcLQohLL6BEeg6OXuO88PIh+8Wgy+E+4rIiFxSaX
WGKy+EWpX962aCAmMPmxOZwxwX8ZECD4yfO2VvBxR+ShNIdF5np8qLyMsdGfQgz4
ndRNE71zAgMBAAECggEABMmSjLJ7NCcZHWDtLCco7j7X3dRmsU5f4eEfvrNLyg/R
x6s6PjlRIfONSDKvT4EGWHsI5GFtjJx5thoYUofSlJdaHi/2ea1Sd08N/ArpvIhT
9LIc4gX6IhIdRavvJ3GxF/CdKpt7I7pgfcHFXO54cYKM26y0hkYLH7jMhjRFy1FN
BmIwc2tlnoWJBpW9vYQ9Dczy0JjHzHLxUv/E2Z/W1OzBEHhOcMGuu7NzZfrSVD+i
XoTHwVuP54GC6lAMuBmGoyR0NZd+pII53B+j5DdTzppuJ5Oa+jNCmQjiouw/jRP0
Zje4XUkQxNzQ2PywLeC/0ja+mLA61RtqXj2U8l6HyQKBgQD9RaddRKlOUEOylhcJ
HxsPQZTz7NsUtj0y7bqa33hDG2b61bwXu+RRNGH25Omaod4/AP2koWW9XWFEgc5a
RXoX1giRhQ39A17VKK370nCTIE5TGiw+cqDMdwy2DsmglkOoiXb7FsP700XQY/CQ
VvIIah86FMczMzAIF3O5qI/MnQKBgQD2B0ekiojaaX0AJXP2Xfnv121aGBYwG+Cz
gSxPGEHoFG85iMLK3jFiehZ9opPv9sQaEWPqLWnplzTT38Zarpfv6FaMvYJL9J9x
VokIkaQX1kc3ZqibPFqYBHTb2Ol5wQ9OGRs/IGHjwA1CJ+iS7GMgpvrzMHQlzYkW
OfNAlewtTwKBgQDCSIk/SalacsXLm8jl7V+Tj2pUx2+zbqx5gdVwclZNnBqd9hEI
X9Cf3j/75dOxE9Rpnjfz7v8diSFRLQX/R2aGHGCMSHXXjZtUhpUYJHDI27JZmy0v
Zj0lO3mburI+pqYWBgUoTWlfpszaM5/ZCWk2vTlhE4lPJEgHHP5gAAb3HQKBgQDE
4mKE3JBUKSLtYQuB1wbS1tUdyjTHXyfcvryUt1bWwLOZmUY5TsK6ifVBqT82Q4X/
Tndkyd7+HhEalPOJUjsotAe/LVD+M878xkF3aAWnRcVMIo0/XXcqPDbAUL/WvZbf
6tuREvsDZYe2r3VBToatdLNSti3cqrTP4qQ1xURxpQKBgQD5bWWHgtqTbVh5Amlt
UA56Rj6IMa8fdFhvtdLJtsHp+bo6CZtVOCWAd/FY/pmkjl8jO0AxgHblljboqhe0
eEq4SQ7mN4BdH1GEo+OyTZLWrDxIw24N5c+tk7ZcKvzCH/CFLqm8SMco2bxPQNky
XuAuqsUFyB3EL9OdIBnkUkuWGg==
-----END PRIVATE KEY-----`;

// Inicialização do Firebase Admin SDK
let app: any = null;
let rawFirestore: any = null;
let rawAdminAuth: any = null;

try {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || DEFAULT_FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || DEFAULT_FIREBASE_PRIVATE_KEY;

    if (privateKey) {
      privateKey = privateKey.trim().replace(/^["']+|["']+$/g, '').replace(/\r/g, '').replace(/\\n/g, '\n');
    }

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
      console.warn("⚠️ Aviso ao carregar Chave de Serviço personalizada do Firebase:", certErr.message || certErr);
      try {
        app = initializeApp({
          credential: cert({
            projectId: DEFAULT_FIREBASE_PROJECT_ID,
            clientEmail: DEFAULT_FIREBASE_CLIENT_EMAIL,
            privateKey: DEFAULT_FIREBASE_PRIVATE_KEY,
          }),
        });
        console.log("🔥 Firebase Admin recuperado com Chave de Serviço padrão.");
      } catch (fallbackErr: any) {
        console.warn("⚠️ Falha em fallback de credenciais:", fallbackErr.message || fallbackErr);
        app = initializeApp({ projectId });
      }
    }
  } else {
    app = getApps()[0];
  }

  const databaseId = process.env.FIREBASE_DATABASE_ID || DEFAULT_FIREBASE_DATABASE_ID;
  rawFirestore = getFirebaseFirestore(app, databaseId);
  try {
    rawFirestore.settings({ preferRest: true });
  } catch (settingsErr) {
    // Silencioso se settings já estiver configurado
  }
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
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    return {
      id: docId,
      async get(): Promise<DocumentSnapshot> {
        // Tentativa 1: Firestore Remoto
        if (rawFirestore) {
          try {
            const docRef = rawFirestore.collection(self.colName).doc(docId);
            const snap: any = await withTimeout(docRef.get(), 10000);
            if (snap.exists) {
              const data = snap.data();
              if (!localStore[self.colName]) localStore[self.colName] = {};
              localStore[self.colName][docId] = data;
              saveLocalData(localStore);
              return { exists: true, id: docId, data: () => data, ref: docRef };
            }
          } catch (err: any) {
            // Se falhar no Firestore, utiliza persistência local
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
        if (!localStore[self.colName]) localStore[self.colName] = {};
        localStore[self.colName][docId] = { ...data };
        saveLocalData(localStore);

        if (rawFirestore) {
          try {
            await withTimeout(rawFirestore.collection(self.colName).doc(docId).set(data), 10000);
          } catch (err) {}
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
            await withTimeout(rawFirestore.collection(self.colName).doc(docId).update(data), 10000);
          } catch (err) {}
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
            await withTimeout(rawFirestore.collection(self.colName).doc(docId).delete(), 10000);
          } catch (err) {}
        }
        return true;
      }
    };
  }

  where(field: string, op: string, val: any) {
    const filters: Array<{ field: string; op: string; val: any }> = [{ field, op, val }];
    let limitCount: number | null = null;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
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
        // Tentativa 1: Firestore Remoto com Timeout
        if (rawFirestore) {
          try {
            let ref = rawFirestore.collection(self.colName);
            for (const f of filters) {
              ref = ref.where(f.field, f.op, f.val);
            }
            if (limitCount !== null) {
              ref = ref.limit(limitCount);
            }
            const snap: any = await withTimeout(ref.get(), 10000);
            if (!snap.empty) {
              snap.docs.forEach((d: any) => {
                if (!localStore[self.colName]) localStore[self.colName] = {};
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
          } catch (err) {}
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
        const snap: any = await withTimeout(rawFirestore.collection(this.colName).get(), 10000);
        if (!snap.empty) {
          snap.docs.forEach((d: any) => {
            if (!localStore[this.colName]) localStore[this.colName] = {};
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
