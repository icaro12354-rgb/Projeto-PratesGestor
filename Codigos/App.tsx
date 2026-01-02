import React, { useState, useEffect, useMemo } from 'react';
import { firebaseAuth, firebaseDb, crudHandlersFactory } from './api/firebase';

// Componentes
import LoginScreen from './components/LoginScreen';
import TeacherDashboard from './components/TeacherDashboard';
import PainelDoResponsavel from './components/PainelDoResponsavel';
import AdminDashboard from './components/AdminDashboard';
import Toast from './components/Toast';
import Header from './components/Header';
import Footer from './components/Footer';

// Tipos
import { User, UserType, AllDataTypes } from './utils/types';

declare var firebase: any;

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [allData, setAllData] = useState<AllDataTypes[]>([]);
  const [toastMessage, setToastMessage] = useState('');
  
  const [loginError, setLoginError] = useState<{uid: string, email: string, details: string} | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const crudHandlers = useMemo(() => crudHandlersFactory(setAllData, showToast), []);

  // --- BUSCA INTELIGENTE DE USUÁRIO (Multi-Gavetas) ---
  const findUserInDatabase = async (uid: string): Promise<{ data: any, key: string } | null> => {
    const pathsToCheck = ['teachers', 'assistants', 'guardians', 'users'];

    for (const path of pathsToCheck) {
      console.log(`🔍 Procurando UID em: /${path}...`);
      const snapshot = await firebaseDb.ref(path).orderByChild('uid').equalTo(uid).once('value');
      
      if (snapshot.exists()) {
        const val = snapshot.val();
        const key = Object.keys(val)[0];
        console.log(`✅ Encontrado em /${path}!`);
        return { data: val[key], key };
      }
    }

    // Busca na Raiz (Legado - Fallback)
    const rootSnapshot = await firebaseDb.ref('/').orderByChild('uid').equalTo(uid).once('value');
    if (rootSnapshot.exists()) {
       const val = rootSnapshot.val();
       const key = Object.keys(val)[0];
       if (val[key].uid === uid) {
          return { data: val[key], key };
       }
    }

    return null;
  };

  // --- EFEITO DE LOGIN ---
  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged(async (currentUser: any) => {
      setLoading(true);
      setLoginError(null);
      
      if (currentUser) {
        try {
          console.log("AUTH OK. UID:", currentUser.uid);

          const found = await findUserInDatabase(currentUser.uid);

          if (found) {
            const userData = found.data;
            const backendId = found.key;

            if (!userData.type) {
                setLoginError({ 
                    uid: currentUser.uid, 
                    email: currentUser.email,
                    details: `Usuário encontrado (ID: ${backendId}), mas sem 'type'.`
                });
                setLoading(false);
                return;
            }

            if (userData.isActive === false) {
                alert("🚫 Seu acesso foi bloqueado pelo administrador.");
                await firebaseAuth.signOut();
                setLoading(false);
                return;
            }

            setUser({ 
              ...userData, 
              id: userData.id || backendId, 
              __backendId: backendId 
            } as User);
            
          } else {
            console.warn("Usuário não encontrado.");
            setLoginError({
                uid: currentUser.uid,
                email: currentUser.email,
                details: "Não encontramos seu cadastro nas pastas do sistema."
            });
            setUser(null);
          }
        } catch (error: any) {
          console.error("Erro crítico:", error);
          showToast("Erro de conexão.");
          setUser(null);
        }
      } else {
        setUser(null);
        setAllData([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- CARREGAMENTO DE DADOS (CORRIGIDO) ---
  useEffect(() => {
    if (!user) return;

    // Cache local para juntar dados de várias pastas
    let localCache: Record<string, AllDataTypes[]> = {};
    
    // Função para atualizar o estado principal
    const updateAllData = () => {
        const flattened = Object.values(localCache).flat();
        // Remove duplicatas por ID (segurança extra)
        const uniqueData = Array.from(new Map(flattened.map(item => [item.id || item.__backendId, item])).values());
        setAllData(uniqueData);
    };

    // Lista de referências para desligar depois (cleanup)
    const activeListeners: any[] = [];

    if (user.type === UserType.Admin) {
        // === MODO ADMIN: LÊ TUDO DA RAIZ ===
        console.log("Modo Admin: Lendo Raiz '/'");
        const dbRef = firebaseDb.ref('/');
        
        const handleData = (snapshot: any) => {
            const val = snapshot.val();
            if (val) {
                let flatList: AllDataTypes[] = [];
                Object.keys(val).forEach(mainKey => {
                    const content = val[mainKey];
                    // Se for pasta conhecida, entra nela
                    if (['teachers', 'students', 'assistants', 'guardians', 'billing', 'payments', 'expenses', 'config', 'teacher_pix'].includes(mainKey)) {
                        Object.entries(content).forEach(([subKey, subValue]: [string, any]) => {
                            if (typeof subValue === 'object') flatList.push({ ...subValue, __backendId: subKey });
                        });
                    } else if (content.type) {
                        flatList.push({ ...content, __backendId: mainKey });
                    }
                });
                setAllData(flatList);
            } else {
                setAllData([]);
            }
        };
        dbRef.on('value', handleData);
        activeListeners.push({ ref: dbRef, handler: handleData });

    } else {
        // === MODO PROFESSOR/OUTROS: LÊ PASTAS ESPECÍFICAS (CORRIGIDO) ===
        console.log("Modo Professor: Lendo pastas separadas.");
        
        // CORREÇÃO AQUI: Adicionadas as pastas 'assistants' e 'guardians' que faltavam
      // ... dentro do useEffect ...

       const foldersToLoad = [
            'students', 
            'payments', 
            'billing', 
            'expenses', 
            'teachers', 
            'config', 
            'assistants', // já tem vírgula
            'guardians',  // <--- COLOCAR VÍRGULA AQUI (linha 184)
            'teacher_pix' // <--- ESCREVER ESSA LINHA NOVA
        ];
        
        foldersToLoad.forEach(folder => {
            const ref = firebaseDb.ref(folder);
            
            const handleFolder = (snapshot: any) => {
                const val = snapshot.val();
                if (val) {
                    const list = Object.entries(val).map(([key, value]: [string, any]) => ({
                        ...value,
                        __backendId: key
                    })) as AllDataTypes[];
                    localCache[folder] = list;
                } else {
                    localCache[folder] = [];
                }
                updateAllData();
            };

            ref.on('value', handleFolder, (error: any) => {
                // Se der erro em uma pasta (ex: permissão), apenas ignora e loga
                console.warn(`Acesso negado ou erro ao ler pasta /${folder}:`, error.message);
            });
            
            activeListeners.push({ ref: ref, handler: handleFolder });
        });
    }

    // Cleanup: Desliga os listeners ao sair
    return () => { 
        activeListeners.forEach(l => l.ref.off('value', l.handler)); 
    };
  }, [user]);

  // --- RENDERIZAÇÃO ---

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 font-medium">Carregando sistema...</p>
    </div>
  );

  if (loginError) {
      return (
        <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-6">
            <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full border-t-8 border-red-600">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">🚫 Erro no Login</h2>
                <div className="bg-red-100 p-4 rounded mb-6 text-red-900">{loginError.details}</div>
                <button onClick={() => firebaseAuth.signOut()} className="w-full bg-gray-800 text-white font-bold py-3 rounded">Voltar</button>
            </div>
        </div>
      );
  }

  if (!user) {
    return (
      <>
        <LoginScreen onLogin={() => {}} showToast={showToast} />
        {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header currentUser={user} onLogout={() => firebaseAuth.signOut()} />

      <main className="flex-grow p-4 container mx-auto max-w-7xl mt-6">
        {user.type === UserType.Admin && (
          <AdminDashboard currentUser={user} onLogout={() => firebaseAuth.signOut()} allData={allData} showToast={showToast} crudHandlers={crudHandlers} />
        )}
        
        {(user.type === UserType.Teacher || user.type === UserType.Assistant) && (
          <TeacherDashboard currentUser={user} onLogout={() => firebaseAuth.signOut()} allData={allData} showToast={showToast} crudHandlers={crudHandlers} />
        )}

        {user.type === UserType.Guardian && (
          <PainelDoResponsavel currentUser={user as any} onLogout={() => firebaseAuth.signOut()} allData={allData} showToast={showToast} />
        )}
      </main>

      <Footer />
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
};

export default App;