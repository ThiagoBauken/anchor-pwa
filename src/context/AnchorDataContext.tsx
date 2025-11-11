
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { AnchorPoint, AnchorTest, User, Project, AnchorTestResult, Location, MarkerShape, Company, UserRole, FloorPlan } from '@/types';
import { useUnifiedAuth } from '@/context/UnifiedAuthContext';
import logger from '@/lib/logger';
// Server actions imported dynamically to avoid SSR issues


type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AnchorDataContextType {
  projects: Project[];
  points: AnchorPoint[];
  allPointsForProject: AnchorPoint[]; // Still needed for some components like project point counts
  tests: AnchorTest[];
  users: User[];
  currentUser: User | null;
  currentProject: Project | null;
  locations: Location[];
  lastUsedLocation: string;
  setLastUsedLocation: (location: string) => void;

  // Floor Plans functionality
  floorPlans: FloorPlan[];
  currentFloorPlan: FloorPlan | null;
  setCurrentFloorPlan: (floorPlan: FloorPlan | null) => void;
  createFloorPlan: (name: string, image: string, order: number) => Promise<void>;
  updateFloorPlan: (floorPlanId: string, name: string, order: number) => Promise<void>;
  deleteFloorPlan: (floorPlanId: string) => Promise<void>;
  toggleFloorPlanActive: (floorPlanId: string, active: boolean) => Promise<void>;
  addProject: (project: Omit<Project, 'id'| 'deleted' | 'createdAt' | 'updatedAt' | 'companyId' | 'company' | 'createdByUserId' | 'createdByUser'>) => void;
  updateProject: (id: string, updates: Partial<Omit<Project, 'id' | 'companyId' | 'createdByUserId' | 'deleted' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  addPoint: (point: Omit<AnchorPoint, 'id' | 'dataHora' | 'status' | 'createdByUserId' | 'lastModifiedByUserId' | 'archived'>) => void;
  editPoint: (pointId: string, updates: Partial<Omit<AnchorPoint, 'id' | 'projectId'>>) => void;
  addMultiplePoints: (points: Omit<AnchorPoint, 'id' | 'dataHora' | 'status' | 'createdByUserId' | 'lastModifiedByUserId' | 'archived'>[]) => void;
  updatePointsAndAddTest: (pontoId: string, testData: Omit<AnchorTestResult, 'id' | 'dataHora' | 'pontoId' | 'createdByUserId'>, pointUpdates: Partial<AnchorPoint>) => void;
  updatePointAndAddOrUpdateTest: (pointId: string, pointUpdates: Partial<Omit<AnchorPoint, 'id' | 'projectId'>>, testData?: Omit<AnchorTestResult, 'id' | 'dataHora' | 'pontoId' | 'createdByUserId'>) => void;
  addFinishedPhotoToTest: (testId: string, photoDataUrl: string) => void;
  deleteProject: (id: string) => void;
  deletePoint: (id: string) => void;
  deleteUser: (userId: string) => void;
  addLocation: (locationName: string) => void;
  deleteLocation: (locationId: string) => void;
  updateLocationShape: (locationId: string, shape: MarkerShape) => void;
  getProjectById: (id: string) => Project | undefined;
  getPointById: (id: string) => AnchorPoint | undefined;
  getTestsByPointId: (pointId: string) => AnchorTest[]; // Changed from getTestByPointId
  inspectionFlags: string[];
  setInspectionFlags: React.Dispatch<React.SetStateAction<string[]>>;
  addUser: (name: string, role: UserRole) => void;
  setCurrentUser: (user: User | null) => void;
  setCurrentProject: (project: Project | null) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  testPointId: string | null;
  setTestPointId: (id: string | null) => void;
  showArchived: boolean;
  setShowArchived: (show: boolean) => void;
  installationDate: Date | undefined;
  setInstallationDate: (date: Date | undefined) => void;
  lineToolMode: boolean;
  setLineToolMode: (mode: boolean) => void;
  lineToolStartPointId: string | null;
  lineToolEndPointId: string | null;
  setLineToolStartPoint: (id: string) => void;
  setLineToolEndPoint: (id: string) => void;
  resetLineTool: () => void;
  lineToolPreviewPoints: { x: number; y: number }[];
  setLineToolPreviewPoints: (points: { x: number; y: number }[]) => void;
  syncStatus: SyncStatus;
}

const AnchorDataContext = createContext<AnchorDataContextType | undefined>(undefined);

export const AnchorDataProvider = ({ children }: { children: ReactNode }) => {
  // Get authenticated user from UnifiedAuthContext
  const { user: authUser, company: authCompany } = useUnifiedAuth();

  // DB state
  const [projects, setProjects] = useState<Project[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Floor Plans state (localStorage-based)
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [currentFloorPlan, setCurrentFloorPlanState] = useState<FloorPlan | null>(null);

  // Local state for points and tests (will be migrated later)
  const [allPoints, setAllPoints] = useState<AnchorPoint[]>([]);
  const [allTests, setAllTests] = useState<AnchorTest[]>([]);

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isLoaded, setIsLoaded] = useState(false);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [inspectionFlags, setInspectionFlags] = useState<string[]>([]);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [testPointId, setTestPointId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [installationDate, setInstallationDate] = useState<Date | undefined>(new Date());
  const [lastUsedLocation, setLastUsedLocation] = useState<string>('');

  const [lineToolMode, setLineToolModeState] = useState(false);
  const [lineToolStartPointId, setLineToolStartPointIdState] = useState<string | null>(null);
  const [lineToolEndPointId, setLineToolEndPointIdState] = useState<string | null>(null);
  const [lineToolPreviewPoints, setLineToolPreviewPoints] = useState<{x: number, y: number}[]>([]);

  const companyId = currentUser?.companyId;

  // Initial data loading from DB and localStorage
  useEffect(() => {
    let hasStartedLoad = false;
    let isCancelled = false; // ✅ CORREÇÃO: Adicionar flag de cancelamento para prevenir race condition

    async function loadInitialData() {
        try {
            // Prevent duplicate timer in React StrictMode
            if (!hasStartedLoad) {
              console.time('⏱️ [LOAD] Total load time')
              console.log('🚀 [LOAD] Starting data load...')
              hasStartedLoad = true
            }

            // ✅ CORREÇÃO: Check if cancelled antes de cada operação async
            if (isCancelled) return;

            // Use authenticated user from DatabaseAuthContext
            // Fallback to localStorage only if not authenticated yet
            const activeUser = authUser || JSON.parse(localStorage.getItem('anchorViewCurrentUser') || 'null');
            const activeCompanyId = authCompany?.id || activeUser?.companyId;

            // If no company ID, cannot load data
            if (!activeCompanyId) {
                logger.warn('[AnchorDataContext] No company ID available, skipping data load');
                if (isCancelled) return;
                setIsLoaded(true);
                return;
            }

            let dbUsers: any[] = [];
            let dbProjects: any[] = [];
            let dbLocations: any[] = [];

            if (activeCompanyId) {
                try {
                    console.time('⏱️ [DB] Database queries')
                    // Import server actions dynamically
                    const { getUsersForCompany } = await import('@/app/actions/user-actions');
                    const { getProjectsForCompany, getLocationsForCompany } = await import('@/app/actions/project-actions');
                    const { dataCache } = await import('@/lib/data-cache');

                    // Use cache to prevent 15+ duplicate calls!
                    [dbUsers, dbProjects, dbLocations] = await Promise.all([
                        dataCache.getOrFetch(`users_${activeCompanyId}`, () => getUsersForCompany(activeCompanyId)),
                        dataCache.getOrFetch(`projects_${activeCompanyId}`, () => getProjectsForCompany(activeCompanyId)),
                        dataCache.getOrFetch(`locations_${activeCompanyId}`, () => getLocationsForCompany(activeCompanyId))
                    ]);
                    console.timeEnd('⏱️ [DB] Database queries')
                    console.log(`✅ [DB] Loaded: ${dbUsers.length} users, ${dbProjects.length} projects, ${dbLocations.length} locations`)

                    // ✅ CORREÇÃO: Check if cancelled após operação async
                    if (isCancelled) return;

                    // ✅ RACE CONDITION FIX: Check before each state update
                    if (!isCancelled) setUsers(dbUsers as any);
                    if (!isCancelled) setProjects(dbProjects as any);

                    // Locations are now project-specific, skip default creation
                    if (!isCancelled) setLocations(dbLocations as any);
                } catch (error) {
                    logger.warn('Failed to load data from server, using localStorage fallback:', error);
                    // Fallback to localStorage
                    dbUsers = [];

                    // ✅ CORREÇÃO: Sempre filtrar projetos deletados do localStorage
                    let rawProjects = JSON.parse(localStorage.getItem('anchorViewProjects') || '[]');

                    // Também tentar o formato antigo (anchor-projects) se não houver no novo formato
                    if (rawProjects.length === 0) {
                      rawProjects = JSON.parse(localStorage.getItem('anchor-projects') || '[]');
                    }

                    // CRITICAL: Filter out deleted projects
                    dbProjects = rawProjects.filter((p: any) => !p.deleted);

                    dbLocations = JSON.parse(localStorage.getItem('anchorViewLocations') || '[]');

                    // ✅ RACE CONDITION FIX: Check before state updates in fallback
                    if (!isCancelled) setProjects(dbProjects);
                    if (!isCancelled) setLocations(dbLocations);
                    logger.log('[DEBUG] Loaded from localStorage with deleted filter:', dbProjects.length);
                }
            }

            // Set currentUser: prefer authUser, then from dbUsers matching activeUser
            if (authUser) {
                // Use authenticated user from DatabaseAuthContext
                // ✅ RACE CONDITION FIX: Check before state updates
                if (!isCancelled) setCurrentUser(authUser as any);
                if (!isCancelled) setUsers(dbUsers as any);
            } else if (dbUsers.length === 0) {
                // Fallback to localStorage if no users in DB
                const localUsers = JSON.parse(localStorage.getItem('anchor-users') || '[]');

                if (localUsers.length > 0) {
                    // ✅ RACE CONDITION FIX: Check before state updates
                    if (!isCancelled) setUsers(localUsers);
                    const matchedUser = localUsers.find((u: User) => u.id === activeUser?.id) || localUsers[0] || null;
                    if (!isCancelled) setCurrentUser(matchedUser);
                } else {
                    // Create default admin user only if nothing exists
                    const defaultUser = {
                        id: 'default-admin',
                        name: 'Administrador',
                        role: 'company_admin' as const,
                        companyId: activeCompanyId,
                        active: true
                    } as User;
                    // ✅ RACE CONDITION FIX: Check before state updates
                    if (!isCancelled) setUsers([defaultUser]);
                    if (!isCancelled) setCurrentUser(defaultUser);
                    localStorage.setItem('anchorViewCurrentUser', JSON.stringify(defaultUser));
                    localStorage.setItem('anchor-users', JSON.stringify([defaultUser]));
                }
            } else {
                // Use user from DB that matches activeUser
                // ✅ RACE CONDITION FIX: Check before state updates
                if (!isCancelled) setUsers(dbUsers as any);
                const matchedUser = (dbUsers as any).find((u: any) => u.id === activeUser?.id) || dbUsers[0] || null;
                if (!isCancelled) setCurrentUser(matchedUser as any);
            }
            
            // ✅ CORREÇÃO: Carregar apenas ID do localStorage, buscar objeto completo de dbProjects
            const savedProjectId = localStorage.getItem('anchorViewCurrentProjectId');
            const savedProject = savedProjectId ? (dbProjects as any).find((p: any) => p.id === savedProjectId) : null;

            // ✅ RACE CONDITION FIX: Check before project state updates
            if (savedProject) {
                if (!isCancelled) setCurrentProject(savedProject);
                logger.log('🔄 Restored project from ID:', savedProject.name);
            } else if (dbProjects.length > 0) {
                if (!isCancelled) setCurrentProject(dbProjects[0] as any);
                logger.log('🎯 Auto-selected first project:', (dbProjects[0] as any).name);
            } else {
                if (!isCancelled) setCurrentProject(null);
                logger.log('⚠️ No projects available');
            }

            // ✅ Limpar objetos antigos do localStorage (migration)
            try {
                localStorage.removeItem('anchorViewCurrentProject');
                localStorage.removeItem('anchorViewCurrentUser');
                localStorage.removeItem('anchorViewPoints');
                localStorage.removeItem('anchorViewTests');
            } catch (e) {
                // Ignore cleanup errors
            }

            // ✅ MIGRATED: Load floor plans from PostgreSQL
            let savedFloorPlans: FloorPlan[] = [];

            if (savedProject?.id) {
                try {
                    console.time('⏱️ [DB] Load floor plans');
                    const { getFloorPlansForProject } = await import('@/app/actions/floorplan-actions');

                    savedFloorPlans = await getFloorPlansForProject(savedProject.id) as any[];

                    console.timeEnd('⏱️ [DB] Load floor plans');
                    console.log(`✅ [DB] Loaded: ${savedFloorPlans.length} floor plans from PostgreSQL`);
                } catch (error) {
                    logger.error('❌ Failed to load floor plans from database, using localStorage fallback:', error);
                    // Fallback to localStorage only if DB fails
                    try {
                        const floorPlansStr = localStorage.getItem('anchorViewFloorPlans');
                        if (floorPlansStr) {
                            savedFloorPlans = JSON.parse(floorPlansStr);
                            // Filter by current project
                            if (savedProject?.id) {
                                savedFloorPlans = savedFloorPlans.filter((fp: FloorPlan) => fp.projectId === savedProject.id);
                            }
                            logger.warn(`⚠️ Using localStorage fallback: ${savedFloorPlans.length} floor plans`);
                        }
                    } catch (fallbackError) {
                        logger.error('❌ Fallback to localStorage also failed:', fallbackError);
                    }
                }
            }

            if (!isCancelled) setFloorPlans(savedFloorPlans);

            // Set current floor plan (first active or first available)
            const activeFloorPlan = savedFloorPlans.find(fp => fp.active) || savedFloorPlans[0] || null;
            if (!isCancelled && activeFloorPlan) {
                setCurrentFloorPlanState(activeFloorPlan);
            }

            // ✅ MIGRATED: Load points and tests from PostgreSQL
            let savedPoints: any[] = [];
            let savedTests: any[] = [];

            if (savedProject?.id) {
                try {
                    console.time('⏱️ [DB] Load points & tests')
                    const { getAnchorPointsForProject, getArchivedAnchorPointsForProject } = await import('@/app/actions/anchor-actions');
                    const { getAnchorTestsForProject } = await import('@/app/actions/anchor-actions');

                    // Load points (both active and archived)
                    const [activePoints, archivedPoints, tests] = await Promise.all([
                        getAnchorPointsForProject(savedProject.id),
                        getArchivedAnchorPointsForProject(savedProject.id),
                        getAnchorTestsForProject(savedProject.id)
                    ]);

                    savedPoints = [...activePoints, ...archivedPoints];
                    savedTests = tests;

                    console.timeEnd('⏱️ [DB] Load points & tests')
                    console.log(`✅ [DB] Loaded: ${savedPoints.length} points, ${savedTests.length} tests from PostgreSQL`);
                } catch (error) {
                    logger.error('❌ Failed to load points/tests from database, using localStorage fallback:', error);
                    // Fallback to localStorage only if DB fails
                    try {
                        const pointsStr = localStorage.getItem('anchorViewPoints');
                        const testsStr = localStorage.getItem('anchorViewTests');

                        if (pointsStr) savedPoints = JSON.parse(pointsStr);
                        if (testsStr) savedTests = JSON.parse(testsStr);

                        logger.warn(`⚠️ Using localStorage fallback: ${savedPoints.length} points, ${savedTests.length} tests`);
                    } catch (fallbackError) {
                        logger.error('❌ Fallback to localStorage also failed:', fallbackError);
                    }
                }
            }

            // ✅ RACE CONDITION FIX: Check before final state updates
            if (!isCancelled) setAllPoints(savedPoints);
            if (!isCancelled) setAllTests(savedTests);

            const savedShowArchived = JSON.parse(localStorage.getItem('anchorViewShowArchived') || 'false');
            const savedLastLocation = JSON.parse(localStorage.getItem('anchorViewLastLocation') || 'null');
            if (!isCancelled) setShowArchived(savedShowArchived);
            if (!isCancelled) setLastUsedLocation(savedLastLocation || '');

            if (!isCancelled) setIsLoaded(true);
            if (!isCancelled) setSyncStatus('saved');

            console.timeEnd('⏱️ [LOAD] Total load time')
            console.log('✅ [LOAD] Data load complete!')
        } catch (error) {
            logger.error("Error in loadInitialData:", error);
            // Set defaults even if loading fails
            // ✅ RACE CONDITION FIX: Check before error state updates
            if (!isCancelled) setIsLoaded(true);
            if (!isCancelled) setSyncStatus('error');
            console.timeEnd('⏱️ [LOAD] Total load time')
        }
    }
    
    loadInitialData().catch(e => {
        logger.error("Failed to load initial data", e);
        if (!isCancelled) {
          setSyncStatus('error');
        }
    });

    // ✅ CORREÇÃO: Cleanup function para cancelar operações pendentes
    return () => {
      isCancelled = true;
      if (hasStartedLoad) {
        console.log('🛑 [LOAD] Cancelled due to component unmount or dependency change');
      }
    };
  }, [authUser, authCompany]); // Re-run when authentication changes

  // Sync floor plans to localStorage
  useEffect(() => {
    if (isLoaded && currentProject?.id) {
      try {
        const allFloorPlans = JSON.parse(localStorage.getItem('anchorViewFloorPlans') || '[]');
        // Remove old floor plans for this project and add current ones
        const otherProjectFloorPlans = allFloorPlans.filter((fp: FloorPlan) => fp.projectId !== currentProject.id);
        const updatedFloorPlans = [...otherProjectFloorPlans, ...floorPlans];
        localStorage.setItem('anchorViewFloorPlans', JSON.stringify(updatedFloorPlans));
      } catch (error) {
        logger.error('Failed to save floor plans to localStorage', error);
      }
    }
  }, [floorPlans, isLoaded, currentProject?.id]);

  // Sync state to localStorage
  useEffect(() => {
    if(isLoaded) {
      setSyncStatus('saving');
      try {
        // ✅ CORREÇÃO: Salvar apenas IDs e dados pequenos, não objetos completos
        // Points e Tests já estão no IndexedDB, não precisam ir para localStorage

        // Save session state (apenas IDs)
        if (currentUser) {
          localStorage.setItem('anchorViewCurrentUserId', currentUser.id);
        }
        if (currentProject) {
          localStorage.setItem('anchorViewCurrentProjectId', currentProject.id);
        }
        localStorage.setItem('anchorViewShowArchived', JSON.stringify(showArchived));
        localStorage.setItem('anchorViewLastLocation', JSON.stringify(lastUsedLocation));

        setTimeout(() => setSyncStatus('saved'), 500);
      } catch (error) {
        logger.error("Failed to save local data to localStorage", error);
        setSyncStatus('error');

        // ✅ Se falhar, limpar localStorage para prevenir QuotaExceededError
        try {
          localStorage.removeItem('anchorViewPoints');
          localStorage.removeItem('anchorViewTests');
          localStorage.removeItem('anchorViewCurrentUser');
          localStorage.removeItem('anchorViewCurrentProject');
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }, [currentUser?.id, currentProject?.id, showArchived, isLoaded, lastUsedLocation]);
  
  const allPointsForProject = useMemo(() => {
    if (!currentProject) return [];
    return allPoints.filter(p => p.projectId === currentProject.id);
  }, [allPoints, currentProject]);

  const projectFilteredPoints = useMemo(() => {
    return allPointsForProject.filter(p => showArchived || !p.archived);
  }, [allPointsForProject, showArchived]);

  const projectFilteredTests = useMemo(() => {
    const projectPointIds = new Set(projectFilteredPoints.map(p => p.id));
    return allTests.filter(t => projectPointIds.has(t.pontoId));
  }, [projectFilteredPoints, allTests]);

  const addUser = useCallback(async (name: string, role: UserRole) => {
    logger.log('[DEBUG] addUser called:', { name, role, companyId });
    if (!companyId) {
      logger.error('[ERROR] addUser: Missing companyId');
      return;
    }

    try {
      const { addUser: addUserAction } = await import('@/app/actions/user-actions');
      const newUser = await addUserAction(name, role, companyId);
      if (newUser) {
        setUsers(prev => {
          const updatedUsers = [...prev, newUser as any];
          // Salvar no localStorage também
          if (typeof window !== 'undefined') {
            localStorage.setItem(`anchor-users`, JSON.stringify(updatedUsers));
          }
          return updatedUsers;
        });
        if (!currentUser) {
          setCurrentUser(newUser as any);
          if (typeof window !== 'undefined') {
            localStorage.setItem('anchorViewCurrentUser', JSON.stringify(newUser));
          }
        }
      }
    } catch (error) {
      logger.error('Erro ao adicionar usuário:', error);
    }
  }, [companyId, currentUser]);

  const deleteUser = useCallback(async (id: string) => {
      logger.log('[DEBUG] deleteUser called:', { id });
      try {
        const { deleteUser: deleteUserAction } = await import('@/app/actions/user-actions');
        const success = await deleteUserAction(id);
      if(success) {
          setUsers(prev => prev.filter(u => u.id !== id));
          // If the deleted user was the current user, select another one or null
          if(currentUser?.id === id) {
              setCurrentUser(users[0] || null);
          }
      }
    } catch (error) {
      logger.error('[ERROR] deleteUser failed:', error);
    }
  }, [users, currentUser]);
  
  const addProject = useCallback(async (projectData: Omit<Project, 'id' | 'companyId' | 'company'| 'deleted' | 'createdAt' | 'updatedAt' | 'createdByUserId' | 'createdByUser'>) => {
    logger.log('[DEBUG] addProject called:', { projectData, currentUser: currentUser?.id, companyId });
    if (!currentUser || !companyId) {
      logger.error('[ERROR] addProject: Missing currentUser or companyId');
      return;
    }
    try {
      const { addProject: addProjectAction } = await import('@/app/actions/project-actions');
      const newProject = await addProjectAction({
          ...projectData,
          companyId: companyId,
          createdByUserId: currentUser.id,
      } as any);
      if (newProject) {
          logger.log('[DEBUG] Project added successfully:', newProject);
          setProjects(prev => [...prev, newProject as any]);
          if (!currentProject) { setCurrentProject(newProject as any); }
      }
    } catch (error) {
      logger.error('[ERROR] addProject failed:', error);
    }
  }, [currentUser, companyId, currentProject]);

  const updateProject = useCallback(async (id: string, updates: Partial<Omit<Project, 'id' | 'companyId' | 'createdByUserId' | 'deleted' | 'createdAt' | 'updatedAt'>>) => {
    logger.log('[DEBUG] updateProject called:', { id, updates });
    if (!currentUser || !companyId) {
      logger.error('[ERROR] updateProject: Missing currentUser or companyId');
      return;
    }
    try {
      const { updateProject: updateProjectAction } = await import('@/app/actions/project-actions');
      const updatedProject = await updateProjectAction(id, updates);
      if (updatedProject) {
        logger.log('[DEBUG] Project updated successfully:', updatedProject);
        setProjects(prev => prev.map(p => p.id === id ? updatedProject as any : p));
        // Also update currentProject if it's the one being edited
        if (currentProject?.id === id) {
          setCurrentProject(updatedProject as any);
        }
      }
    } catch (error) {
      logger.error('[ERROR] updateProject failed:', error);
      throw error;
    }
  }, [currentUser, companyId, currentProject]);

  const deleteProject = useCallback(async (id: string) => {
    logger.log('[DEBUG] deleteProject called:', { id });

    // ✅ CORREÇÃO CRÍTICA: Limpar cache ANTES de deletar para prevenir projetos voltando
    if (typeof window !== 'undefined') {
      try {
        const { dataCache } = await import('@/lib/data-cache');
        if (companyId) {
          dataCache.clear(`projects_${companyId}`);
          logger.log('[DEBUG] Cache cleared BEFORE delete');
        }
      } catch (e) {
        logger.warn('Failed to clear cache:', e);
      }
    }

    try {
      const { deleteProject: deleteProjectAction } = await import('@/app/actions/project-actions');
      const success = await deleteProjectAction(id);

      // ✅ CRITICAL FIX: CASCADE DELETE - Remove orphaned points and tests
      const orphanedPoints = allPoints.filter(p => p.projectId === id);
      const orphanedPointIds = orphanedPoints.map(p => p.id);

      logger.log(`[DEBUG] Cascade deleting ${orphanedPoints.length} points and their tests for project ${id}`);

      // Remove points from state
      setAllPoints(prevPoints => prevPoints.filter(p => p.projectId !== id));

      // Remove tests from state
      setAllTests(prevTests => prevTests.filter(t => !orphanedPointIds.includes(t.pontoId)));

      // ✅ SEMPRE remover do estado e localStorage, MESMO se server delete falhar
      const remainingProjects = projects.filter(p => p.id !== id);
      setProjects(remainingProjects);
      if (currentProject?.id === id) {
          setCurrentProject(remainingProjects.length > 0 ? remainingProjects[0] : null);
          localStorage.removeItem('anchorViewCurrentProject');
      }

      // IMPORTANT: Also remove from localStorage to prevent reappearing
      if (typeof window !== 'undefined') {
        try {
          // Import SafeStorage
          const { SafeStorage } = await import('@/lib/safe-storage');

          // Marcar como deleted no formato antigo
          const storedProjects = JSON.parse(localStorage.getItem('anchor-projects') || '[]');
          const updatedProjects = storedProjects.map((p: any) =>
            p.id === id ? { ...p, deleted: true } : p
          );
          SafeStorage.setItem('anchor-projects', JSON.stringify(updatedProjects));

          // Também marcar no formato novo
          const newFormatProjects = JSON.parse(localStorage.getItem('anchorViewProjects') || '[]');
          const updatedNewFormat = newFormatProjects.map((p: any) =>
            p.id === id ? { ...p, deleted: true } : p
          );
          SafeStorage.setItem('anchorViewProjects', JSON.stringify(updatedNewFormat));

          // ✅ CASCADE DELETE: Clean up points and tests in localStorage
          const remainingPoints = allPoints.filter(p => p.projectId !== id);
          SafeStorage.setItem('anchorViewPoints', JSON.stringify(remainingPoints));

          const remainingTests = allTests.filter(t => !orphanedPointIds.includes(t.pontoId));
          SafeStorage.setItem('anchorViewTests', JSON.stringify(remainingTests));

          logger.log(`[DEBUG] Project marked as deleted in localStorage. Cascade deleted ${orphanedPoints.length} points, ${allTests.length - remainingTests.length} tests`);
        } catch (e) {
          logger.warn('Failed to update localStorage:', e);
        }
      }

      if (success) {
        logger.log('[DEBUG] Project deleted successfully on server');
      } else {
        logger.warn('[WARN] Project deleted locally but server delete failed');
      }
    } catch (error) {
      logger.error('[ERROR] deleteProject failed:', error);

      // ✅ MESMO com erro, remover localmente
      const remainingProjects = projects.filter(p => p.id !== id);
      setProjects(remainingProjects);
      if (currentProject?.id === id) {
          setCurrentProject(remainingProjects.length > 0 ? remainingProjects[0] : null);
      }
    }
  }, [projects, currentProject, companyId]);

  const addPoint = useCallback(async (pointData: Omit<AnchorPoint, 'id' | 'dataHora' | 'status' | 'createdByUserId' | 'lastModifiedByUserId' | 'archived'>) => {
    logger.log('[DEBUG] addPoint called:', { pointData, currentUser: currentUser?.id });
    if (!currentUser) {
      logger.error('[ERROR] addPoint: No user selected');
      alert("Por favor, selecione um usuário primeiro.");
      return;
    }

    try {
      // ✅ MIGRATED: Call server action
      const { addAnchorPoint } = await import('@/app/actions/anchor-actions');
      const newPoint = await addAnchorPoint(pointData);

      // Update local state
      setAllPoints(prevPoints => [...prevPoints, newPoint as any]);
      logger.log('[DEBUG] Point added successfully to PostgreSQL:', newPoint);
    } catch (error) {
      logger.error('[ERROR] addPoint failed:', error);
      alert('Erro ao adicionar ponto. Tente novamente.');
    }
  }, [currentUser]);

  const editPoint = useCallback(async (pointId: string, updates: Partial<Omit<AnchorPoint, 'id' | 'projectId'>>) => {
      logger.log('[DEBUG] editPoint called:', { pointId, updates, currentUser: currentUser?.id });
      if (!currentUser) {
        logger.error('[ERROR] editPoint: No user selected');
        alert("Por favor, selecione um usuário primeiro.");
        return;
      }

      try {
        // ✅ MIGRATED: Call server action
        const { updateAnchorPoint } = await import('@/app/actions/anchor-actions');
        const updatedPoint = await updateAnchorPoint(pointId, updates);

        // Update local state
        setAllPoints(prevPoints => prevPoints.map(p =>
          p.id === pointId ? updatedPoint as any : p
        ));

        if(updates.localizacao) {
            setLastUsedLocation(updates.localizacao);
        }

        logger.log('[DEBUG] Point edited successfully in PostgreSQL:', updatedPoint);
      } catch (error) {
        logger.error('[ERROR] editPoint failed:', error);
        alert('Erro ao editar ponto. Tente novamente.');
      }
  }, [currentUser]);

  const addMultiplePoints = useCallback(async (pointsData: Omit<AnchorPoint, 'id' | 'dataHora' | 'status' | 'createdByUserId' | 'lastModifiedByUserId' | 'archived'>[]) => {
    logger.log('[DEBUG] addMultiplePoints called:', { count: pointsData.length, currentUser: currentUser?.id });
    if (!currentUser) {
      logger.error('[ERROR] addMultiplePoints: No user selected');
      alert("Por favor, selecione um usuário primeiro.");
      return;
    }

    try {
      // ✅ MIGRATED: Call server action for each point
      const { addAnchorPoint } = await import('@/app/actions/anchor-actions');

      const newPoints = await Promise.all(
        pointsData.map(pointData => addAnchorPoint(pointData))
      );

      // Update local state
      setAllPoints(prev => [...prev, ...newPoints as any[]]);

      if (newPoints.length > 0) {
        setLastUsedLocation(newPoints[newPoints.length - 1].localizacao);
      }

      logger.log('[DEBUG] Multiple points added successfully to PostgreSQL:', newPoints.length);
    } catch (error) {
      logger.error('[ERROR] addMultiplePoints failed:', error);
      alert('Erro ao adicionar pontos. Tente novamente.');
    }
  }, [currentUser]);

  const updatePointsAndAddTest = useCallback(async (pontoId: string, testData: Omit<AnchorTestResult, 'id' | 'dataHora' | 'pontoId' | 'createdByUserId'>, pointUpdates: Partial<AnchorPoint>) => {
     logger.log('[DEBUG] updatePointsAndAddTest called:', { pontoId, testData, pointUpdates });
     if (!currentUser) {
       logger.error('[ERROR] updatePointsAndAddTest: No user selected');
       alert("Por favor, selecione um usuário primeiro.");
       return;
     }

    try {
      // ✅ MIGRATED: Call server action to add test (auto-updates point status)
      const { addAnchorTest } = await import('@/app/actions/anchor-actions');
      const newTest = await addAnchorTest({ ...testData, pontoId });

      // Update local state for test
      setAllTests(prevTests => [...prevTests, newTest as any]);

      // Update local state for point (server already updated status, but apply manual updates too)
      setAllPoints(prevPoints => prevPoints.map(p => {
        if (p.id === pontoId) {
          const hasUpdates = Object.keys(pointUpdates).length > 0;
          return { ...p, ...(hasUpdates ? pointUpdates : {}), status: newTest.resultado as any, lastModifiedByUserId: currentUser.id };
        }
        return p;
      }));

      logger.log('[DEBUG] Point updated and test added successfully to PostgreSQL');
    } catch (error) {
      logger.error('[ERROR] updatePointsAndAddTest failed:', error);
      alert('Erro ao adicionar teste. Tente novamente.');
    }
  }, [currentUser]);
  
  const addFinishedPhotoToTest = useCallback(async (testId: string, photoDataUrl: string) => {
    logger.log('[DEBUG] addFinishedPhotoToTest called:', { testId, hasPhoto: !!photoDataUrl });

    try {
      // ✅ MIGRATED: Call server action to update test
      const { updateAnchorTest } = await import('@/app/actions/anchor-actions');
      const updatedTest = await updateAnchorTest(testId, {
        fotoPronto: photoDataUrl,
        dataFotoPronto: new Date().toISOString()
      });

      // Update local state
      setAllTests(prevTests => prevTests.map(t => t.id === testId ? updatedTest as any : t));
      logger.log('[DEBUG] Finished photo added to test successfully in PostgreSQL');
    } catch (error) {
      logger.error('[ERROR] addFinishedPhotoToTest failed:', error);
      alert('Erro ao adicionar foto final. Tente novamente.');
    }
  }, []);
  
  const updatePointAndAddOrUpdateTest = useCallback(async (pointId: string, pointUpdates: Partial<Omit<AnchorPoint, 'id' | 'projectId'>>, testData?: Omit<AnchorTestResult, 'id' | 'dataHora' | 'pontoId' | 'createdByUserId'>) => {
    logger.log('[DEBUG] updatePointAndAddOrUpdateTest called:', { pointId, pointUpdates, hasTestData: !!testData });
    if (!currentUser) {
      logger.error('[ERROR] updatePointAndAddOrUpdateTest: No user selected');
      alert("Por favor, selecione um usuário primeiro.");
      return;
    }

    try {
      let newStatus: 'Aprovado' | 'Reprovado' | 'Não Testado' | undefined = undefined;

      // ✅ MIGRATED: If test data is provided, create a new test
      if (testData) {
        const { addAnchorTest } = await import('@/app/actions/anchor-actions');
        const newTest = await addAnchorTest({ ...testData, pontoId: pointId });
        setAllTests(prevTests => [...prevTests, newTest as any]);
        newStatus = newTest.resultado as any;
      }

      // ✅ MIGRATED: Update the point
      const { updateAnchorPoint } = await import('@/app/actions/anchor-actions');
      const finalUpdates = { ...pointUpdates };
      if (newStatus) {
        finalUpdates.status = newStatus;
      }

      const updatedPoint = await updateAnchorPoint(pointId, finalUpdates);

      // Update local state
      setAllPoints(prevPoints => prevPoints.map(p => p.id === pointId ? updatedPoint as any : p));

      if (pointUpdates.localizacao) {
        setLastUsedLocation(pointUpdates.localizacao);
      }

      logger.log('[DEBUG] Point and test updated successfully in PostgreSQL:', updatedPoint);
    } catch (error) {
      logger.error('[ERROR] updatePointAndAddOrUpdateTest failed:', error);
      alert('Erro ao atualizar ponto/teste. Tente novamente.');
    }
  }, [currentUser]);

  const deletePoint = useCallback(async (id: string) => {
    logger.log('[DEBUG] deletePoint called:', { id, currentUser: currentUser?.id });
    if (!currentUser) {
      logger.error('[ERROR] deletePoint: No user selected');
      return;
    }

    try {
      // ✅ MIGRATED: Call server action to archive point (soft delete)
      const { archiveAnchorPoint } = await import('@/app/actions/anchor-actions');
      const archivedPoint = await archiveAnchorPoint(id);

      // Update local state
      setAllPoints(prev => prev.map(p => p.id === id ? archivedPoint as any : p));
      logger.log('[DEBUG] Point archived successfully in PostgreSQL:', archivedPoint);
    } catch (error) {
      logger.error('[ERROR] deletePoint failed:', error);
      alert('Erro ao arquivar ponto. Tente novamente.');
    }
  }, [currentUser]);
  
  const addLocation = useCallback(async (locationName: string) => {
    logger.log('[DEBUG] addLocation called:', { locationName, companyId });
    if (!companyId) {
      logger.error('[ERROR] addLocation: Missing companyId');
      return;
    }
    try {
      const { addLocation: addLocationAction } = await import('@/app/actions/project-actions');
      const newLocation = await addLocationAction(locationName, 'circle', companyId);
      if(newLocation) {
          setLocations(prev => [...prev, newLocation as any]);
          logger.log('[DEBUG] Location added successfully:', newLocation);
      }
    } catch (error) {
      logger.error('[ERROR] addLocation failed:', error);
    }
  }, [companyId]);

  const deleteLocation = useCallback(async (locationId: string) => {
    logger.log('[DEBUG] deleteLocation called:', { locationId });
    try {
      const { deleteLocation: deleteLocationAction } = await import('@/app/actions/project-actions');
      const success = await deleteLocationAction(locationId);
      if(success) {
          setLocations(prev => prev.filter(l => l.id !== locationId));
          logger.log('[DEBUG] Location deleted successfully');
      }
    } catch (error) {
      logger.error('[ERROR] deleteLocation failed:', error);
    }
  }, []);
  
  const updateLocationShape = useCallback(async (locationId: string, shape: MarkerShape) => {
    logger.log('[DEBUG] updateLocationShape called:', { locationId, shape });
    logger.log('[DEBUG] Current locations before update:', locations);
    try {
      const { updateLocationShape: updateLocationShapeAction } = await import('@/app/actions/project-actions');
      const updatedLocation = await updateLocationShapeAction(locationId, shape);
      logger.log('[DEBUG] Updated location from action:', updatedLocation);
      if(updatedLocation) {
          setLocations(prev => {
            const newLocations = prev.map(loc => loc.id === locationId ? (updatedLocation as any) : loc);
            logger.log('[DEBUG] New locations after update:', newLocations);
            return newLocations;
          });
          logger.log('[DEBUG] Location shape updated successfully');
      } else {
        logger.error('[ERROR] No location returned from updateLocationShapeAction');
      }
    } catch (error) {
      logger.error('[ERROR] updateLocationShape failed:', error);
    }
  }, [locations]);

  const getProjectById = useCallback((id: string) => projects.find(p => p.id === id), [projects]);
  const getPointById = useCallback((id: string) => allPoints.find(p => p.id === id), [allPoints]);
  const getTestsByPointId = useCallback((pointId: string) => allTests.filter(t => t.pontoId === pointId).sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime()), [allTests]);
  
  const setLineToolMode = useCallback((mode: boolean) => {
    setLineToolModeState(mode);
    if (!mode) {
      setLineToolStartPointIdState(null);
      setLineToolEndPointIdState(null);
      setLineToolPreviewPoints([]);
    }
  }, []);

  const setLineToolStartPoint = useCallback((id: string) => {
    setLineToolEndPointIdState(null);
    setLineToolStartPointIdState(id);
  }, []);

  const setLineToolEndPoint = useCallback((id: string) => {
    if (id !== lineToolStartPointId) {
      setLineToolEndPointIdState(id);
    }
  }, [lineToolStartPointId]);

  const resetLineTool = useCallback(() => {
    setLineToolStartPointIdState(null);
    setLineToolEndPointIdState(null);
    setLineToolPreviewPoints([]);
    setLineToolModeState(false);
  }, []);

  // ===== FLOOR PLAN CRUD OPERATIONS =====

  /**
   * Creates a new floor plan for the current project
   */
  const createFloorPlan = useCallback(async (name: string, image: string, order: number) => {
    logger.log('[DEBUG] createFloorPlan called:', { name, order, projectId: currentProject?.id });

    if (!currentProject) {
      logger.error('[ERROR] createFloorPlan: No project selected');
      return;
    }

    if (!currentUser) {
      logger.error('[ERROR] createFloorPlan: No user selected');
      return;
    }

    try {
      // ✅ MIGRATED: Call server action to create floor plan
      const { createFloorPlan: createFloorPlanAction } = await import('@/app/actions/floorplan-actions');
      const newFloorPlan = await createFloorPlanAction(currentProject.id, name, image, order);

      if (!newFloorPlan) {
        throw new Error('Failed to create floor plan');
      }

      // Update local state
      setFloorPlans(prev => [...prev, newFloorPlan as any]);

      // If this is the first floor plan, set it as current
      if (floorPlans.length === 0) {
        setCurrentFloorPlanState(newFloorPlan as any);
      }

      logger.log('[DEBUG] Floor plan created successfully in PostgreSQL:', newFloorPlan);
    } catch (error) {
      logger.error('[ERROR] createFloorPlan failed:', error);
      alert('Erro ao criar planta baixa. Tente novamente.');
      throw error;
    }
  }, [currentProject, currentUser, floorPlans]);

  /**
   * Updates an existing floor plan
   */
  const updateFloorPlan = useCallback(async (floorPlanId: string, name: string, order: number) => {
    logger.log('[DEBUG] updateFloorPlan called:', { floorPlanId, name, order });

    if (!currentUser) {
      logger.error('[ERROR] updateFloorPlan: No user selected');
      return;
    }

    try {
      // ✅ MIGRATED: Call server action to update floor plan
      const { updateFloorPlan: updateFloorPlanAction } = await import('@/app/actions/floorplan-actions');
      const updatedFloorPlan = await updateFloorPlanAction(floorPlanId, name, order);

      if (!updatedFloorPlan) {
        throw new Error('Failed to update floor plan');
      }

      // Update local state
      setFloorPlans(prev => prev.map(fp => fp.id === floorPlanId ? updatedFloorPlan as any : fp));

      // Also update currentFloorPlan if it's the one being edited
      if (currentFloorPlan?.id === floorPlanId) {
        setCurrentFloorPlanState(updatedFloorPlan as any);
      }

      logger.log('[DEBUG] Floor plan updated successfully in PostgreSQL:', updatedFloorPlan);
    } catch (error) {
      logger.error('[ERROR] updateFloorPlan failed:', error);
      alert('Erro ao atualizar planta baixa. Tente novamente.');
      throw error;
    }
  }, [currentUser, currentFloorPlan]);

  /**
   * Deletes a floor plan and cascades to remove associated points
   */
  const deleteFloorPlan = useCallback(async (floorPlanId: string) => {
    logger.log('[DEBUG] deleteFloorPlan called:', { floorPlanId });

    if (!currentUser) {
      logger.error('[ERROR] deleteFloorPlan: No user selected');
      return;
    }

    try {
      // ✅ MIGRATED: Call server action to delete floor plan (handles cascade on server)
      const { deleteFloorPlan: deleteFloorPlanAction } = await import('@/app/actions/floorplan-actions');
      const success = await deleteFloorPlanAction(floorPlanId);

      if (!success) {
        throw new Error('Failed to delete floor plan');
      }

      // Update local state - remove points associated with this floor plan
      const pointsToDelete = allPoints.filter(p => p.floorPlanId === floorPlanId);
      const pointIdsToDelete = pointsToDelete.map(p => p.id);

      logger.log(`[DEBUG] Removing ${pointsToDelete.length} points from local state for floor plan ${floorPlanId}`);

      setAllPoints(prev => prev.filter(p => p.floorPlanId !== floorPlanId));
      setAllTests(prev => prev.filter(t => !pointIdsToDelete.includes(t.pontoId)));

      // Remove floor plan from local state
      const remainingFloorPlans = floorPlans.filter(fp => fp.id !== floorPlanId);
      setFloorPlans(remainingFloorPlans);

      // If deleted floor plan was current, switch to another one
      if (currentFloorPlan?.id === floorPlanId) {
        const nextFloorPlan = remainingFloorPlans.find(fp => fp.active) || remainingFloorPlans[0] || null;
        setCurrentFloorPlanState(nextFloorPlan);
      }

      logger.log('[DEBUG] Floor plan deleted successfully from PostgreSQL. Cascade completed.');
    } catch (error) {
      logger.error('[ERROR] deleteFloorPlan failed:', error);
      alert('Erro ao deletar planta baixa. Tente novamente.');
      throw error;
    }
  }, [currentUser, floorPlans, currentFloorPlan, allPoints]);

  /**
   * Toggles the active state of a floor plan
   */
  const toggleFloorPlanActive = useCallback(async (floorPlanId: string, active: boolean) => {
    logger.log('[DEBUG] toggleFloorPlanActive called:', { floorPlanId, active });

    if (!currentUser) {
      logger.error('[ERROR] toggleFloorPlanActive: No user selected');
      return;
    }

    try {
      // ✅ MIGRATED: Call server action to toggle floor plan active state
      const { toggleFloorPlanActive: toggleFloorPlanActiveAction } = await import('@/app/actions/floorplan-actions');
      const updatedFloorPlan = await toggleFloorPlanActiveAction(floorPlanId, active);

      if (!updatedFloorPlan) {
        throw new Error('Failed to toggle floor plan active state');
      }

      // Update local state
      setFloorPlans(prev => prev.map(fp => fp.id === floorPlanId ? updatedFloorPlan as any : fp));

      // If activating this floor plan, set it as current
      if (active) {
        setCurrentFloorPlanState(updatedFloorPlan as any);
      } else if (currentFloorPlan?.id === floorPlanId) {
        // If deactivating current floor plan, switch to first active one
        const nextActive = floorPlans.find(f => f.id !== floorPlanId && f.active) || floorPlans.find(f => f.id !== floorPlanId) || null;
        setCurrentFloorPlanState(nextActive);
      }

      logger.log('[DEBUG] Floor plan active state toggled in PostgreSQL:', updatedFloorPlan);
    } catch (error) {
      logger.error('[ERROR] toggleFloorPlanActive failed:', error);
      alert('Erro ao alternar estado da planta baixa. Tente novamente.');
      throw error;
    }
  }, [currentUser, floorPlans, currentFloorPlan]);

  /**
   * Sets the current floor plan
   */
  const setCurrentFloorPlan = useCallback((floorPlan: FloorPlan | null) => {
    logger.log('[DEBUG] setCurrentFloorPlan called:', { floorPlanId: floorPlan?.id, floorPlanName: floorPlan?.name });
    setCurrentFloorPlanState(floorPlan);
  }, []);

  // ===== END FLOOR PLAN CRUD OPERATIONS =====

  const value = {
    projects,
    points: projectFilteredPoints,
    allPointsForProject,
    tests: projectFilteredTests,
    users,
    currentUser,
    currentProject,
    locations,
    lastUsedLocation,
    setLastUsedLocation,

    // Floor Plans
    floorPlans,
    currentFloorPlan,
    setCurrentFloorPlan,
    createFloorPlan,
    updateFloorPlan,
    deleteFloorPlan,
    toggleFloorPlanActive,

    addProject,
    updateProject,
    addPoint,
    editPoint,
    addMultiplePoints,
    updatePointsAndAddTest,
    updatePointAndAddOrUpdateTest,
    addFinishedPhotoToTest,
    deleteProject,
    deletePoint,
    deleteUser,
    addLocation,
    deleteLocation,
    updateLocationShape,
    getProjectById,
    getPointById,
    getTestsByPointId,
    inspectionFlags,
    setInspectionFlags,
    addUser,
    setCurrentUser,
    setCurrentProject,
    activeTab,
    setActiveTab,
    testPointId,
    setTestPointId,
    showArchived,
    setShowArchived,
    installationDate,
    setInstallationDate,
    lineToolMode,
    setLineToolMode,
    lineToolStartPointId,
    setLineToolStartPoint,
    lineToolEndPointId,
    setLineToolEndPoint,
    resetLineTool,
    lineToolPreviewPoints,
    setLineToolPreviewPoints,
    syncStatus,
  };

  return (
    <AnchorDataContext.Provider value={value}>
      {children}
    </AnchorDataContext.Provider>
  );
};

export const useAnchorData = () => {
  const context = useContext(AnchorDataContext);
  if (context === undefined) { throw new Error('useAnchorData must be used within an AnchorDataProvider'); }
  return context;
};
