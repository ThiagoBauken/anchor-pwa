
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { AnchorPoint, AnchorTest, User, Project, AnchorTestResult, Location, MarkerShape, Company, UserRole } from '@/types';
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
  addProject: (project: Omit<Project, 'id'| 'deleted' | 'createdAt' | 'updatedAt' | 'companyId' | 'company' | 'createdByUserId' | 'createdByUser'>) => void;
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
    async function loadInitialData() {
        try {
            console.time('⏱️ [LOAD] Total load time')
            console.log('🚀 [LOAD] Starting data load...')

            // Use authenticated user from DatabaseAuthContext
            // Fallback to localStorage only if not authenticated yet
            const activeUser = authUser || JSON.parse(localStorage.getItem('anchorViewCurrentUser') || 'null');
            const activeCompanyId = authCompany?.id || activeUser?.companyId;

            // If no company ID, cannot load data
            if (!activeCompanyId) {
                logger.warn('[AnchorDataContext] No company ID available, skipping data load');
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

                    setUsers(dbUsers as any);
                    setProjects(dbProjects as any);

                    // Locations are now project-specific, skip default creation
                    setLocations(dbLocations as any);
                } catch (error) {
                    logger.warn('Failed to load data from server, using localStorage fallback:', error);
                    // Fallback to localStorage
                    dbUsers = [];
                    const rawProjects = JSON.parse(localStorage.getItem('anchorViewProjects') || '[]');
                    // CRITICAL: Filter out deleted projects
                    dbProjects = rawProjects.filter((p: any) => !p.deleted);
                    dbLocations = JSON.parse(localStorage.getItem('anchorViewLocations') || '[]');
                    setProjects(dbProjects);
                    setLocations(dbLocations);
                    logger.log('[DEBUG] Loaded from localStorage with deleted filter:', dbProjects.length);
                }
            }

            // Set currentUser: prefer authUser, then from dbUsers matching activeUser
            if (authUser) {
                // Use authenticated user from DatabaseAuthContext
                setCurrentUser(authUser as any);
                setUsers(dbUsers as any);
            } else if (dbUsers.length === 0) {
                // Fallback to localStorage if no users in DB
                const localUsers = JSON.parse(localStorage.getItem('anchor-users') || '[]');

                if (localUsers.length > 0) {
                    setUsers(localUsers);
                    const matchedUser = localUsers.find((u: User) => u.id === activeUser?.id) || localUsers[0] || null;
                    setCurrentUser(matchedUser);
                } else {
                    // Create default admin user only if nothing exists
                    const defaultUser = {
                        id: 'default-admin',
                        name: 'Administrador',
                        role: 'company_admin' as const,
                        companyId: activeCompanyId,
                        active: true
                    } as User;
                    setUsers([defaultUser]);
                    setCurrentUser(defaultUser);
                    localStorage.setItem('anchorViewCurrentUser', JSON.stringify(defaultUser));
                    localStorage.setItem('anchor-users', JSON.stringify([defaultUser]));
                }
            } else {
                // Use user from DB that matches activeUser
                setUsers(dbUsers as any);
                const matchedUser = (dbUsers as any).find((u: any) => u.id === activeUser?.id) || dbUsers[0] || null;
                setCurrentUser(matchedUser as any);
            }
            
            const savedCurrentProject = JSON.parse(localStorage.getItem('anchorViewCurrentProject') || 'null');
            const projectExists = (dbProjects as any).some((p: any) => p.id === savedCurrentProject?.id);

            if (savedCurrentProject && projectExists) {
                setCurrentProject(savedCurrentProject);
            } else if (dbProjects.length > 0) {
                setCurrentProject(dbProjects[0] as any);
            } else {
                setCurrentProject(null);
            }

            // Load points and tests from localStorage (for now)
            console.time('⏱️ [localStorage] Parse points & tests')
            const savedPoints = JSON.parse(localStorage.getItem('anchorViewPoints') || '[]');
            const savedTests = JSON.parse(localStorage.getItem('anchorViewTests') || '[]');
            console.timeEnd('⏱️ [localStorage] Parse points & tests')
            console.log(`✅ [localStorage] Loaded: ${savedPoints.length} points, ${savedTests.length} tests`)

            setAllPoints(savedPoints);
            setAllTests(savedTests);

            const savedShowArchived = JSON.parse(localStorage.getItem('anchorViewShowArchived') || 'false');
            const savedLastLocation = JSON.parse(localStorage.getItem('anchorViewLastLocation') || 'null');
            setShowArchived(savedShowArchived);
            setLastUsedLocation(savedLastLocation || '');

            setIsLoaded(true);
            setSyncStatus('saved');

            console.timeEnd('⏱️ [LOAD] Total load time')
            console.log('✅ [LOAD] Data load complete!')
        } catch (error) {
            logger.error("Error in loadInitialData:", error);
            // Set defaults even if loading fails
            setIsLoaded(true);
            setSyncStatus('error');
            console.timeEnd('⏱️ [LOAD] Total load time')
        }
    }
    
    loadInitialData().catch(e => {
        logger.error("Failed to load initial data", e);
        setSyncStatus('error');
    });
  }, [authUser, authCompany]); // Re-run when authentication changes

  // Sync state to localStorage
  useEffect(() => {
    if(isLoaded) {
      setSyncStatus('saving');
      try {
        // Only save things that are not in the DB yet
        localStorage.setItem('anchorViewPoints', JSON.stringify(allPoints));
        localStorage.setItem('anchorViewTests', JSON.stringify(allTests));

        // Save session state
        localStorage.setItem('anchorViewCurrentUser', JSON.stringify(currentUser));
        localStorage.setItem('anchorViewCurrentProject', JSON.stringify(currentProject));
        localStorage.setItem('anchorViewShowArchived', JSON.stringify(showArchived));
        localStorage.setItem('anchorViewLastLocation', JSON.stringify(lastUsedLocation));

        setTimeout(() => setSyncStatus('saved'), 500);
      } catch (error) { 
        logger.error("Failed to save local data to localStorage", error); 
        setSyncStatus('error');
      }
    }
  }, [allPoints, allTests, currentUser, currentProject, showArchived, isLoaded, lastUsedLocation]);
  
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
  
  const deleteProject = useCallback(async (id: string) => {
    logger.log('[DEBUG] deleteProject called:', { id });
    try {
      const { deleteProject: deleteProjectAction } = await import('@/app/actions/project-actions');
      const success = await deleteProjectAction(id);
    if(success) {
        const remainingProjects = projects.filter(p => p.id !== id);
        setProjects(remainingProjects);
        if (currentProject?.id === id) {
            setCurrentProject(remainingProjects.length > 0 ? remainingProjects[0] : null);
            localStorage.removeItem('anchorViewCurrentProject');
        }

        // IMPORTANT: Also remove from localStorage to prevent reappearing
        if (typeof window !== 'undefined') {
          try {
            const storedProjects = JSON.parse(localStorage.getItem('anchor-projects') || '[]');
            const updatedProjects = storedProjects.map((p: any) =>
              p.id === id ? { ...p, deleted: true } : p
            );
            localStorage.setItem('anchor-projects', JSON.stringify(updatedProjects));
            logger.log('[DEBUG] Project also marked as deleted in localStorage');
          } catch (e) {
            logger.warn('Failed to update localStorage:', e);
          }
        }

        logger.log('[DEBUG] Project deleted successfully');
    }
    } catch (error) {
      logger.error('[ERROR] deleteProject failed:', error);
    }
  }, [projects, currentProject]);

  const addPoint = useCallback((pointData: Omit<AnchorPoint, 'id' | 'dataHora' | 'status' | 'createdByUserId' | 'lastModifiedByUserId' | 'archived'>) => {
    logger.log('[DEBUG] addPoint called:', { pointData, currentUser: currentUser?.id });
    if (!currentUser) { 
      logger.error('[ERROR] addPoint: No user selected');
      alert("Por favor, selecione um usuário primeiro."); 
      return; 
    }
    const newPoint: AnchorPoint = {
      ...pointData,
      id: Date.now().toString(),
      dataHora: new Date().toISOString(),
      status: 'Não Testado',
      createdByUserId: currentUser.id,
      lastModifiedByUserId: currentUser.id,
      archived: false,
    };
    setAllPoints(prevPoints => [...prevPoints, newPoint]);
    logger.log('[DEBUG] Point added successfully:', newPoint);
  }, [currentUser]);

  const editPoint = useCallback((pointId: string, updates: Partial<Omit<AnchorPoint, 'id' | 'projectId'>>) => {
      logger.log('[DEBUG] editPoint called:', { pointId, updates, currentUser: currentUser?.id });
      if (!currentUser) { 
        logger.error('[ERROR] editPoint: No user selected');
        alert("Por favor, selecione um usuário primeiro."); 
        return; 
      }
      setAllPoints(prevPoints => prevPoints.map(p => {
          if (p.id === pointId) {
              const updatedPoint = { ...p, ...updates, lastModifiedByUserId: currentUser.id };
              if(updates.localizacao) {
                  setLastUsedLocation(updates.localizacao);
              }
              logger.log('[DEBUG] Point edited successfully:', updatedPoint);
              return updatedPoint;
          }
          return p;
      }));
  }, [currentUser]);

  const addMultiplePoints = useCallback((pointsData: Omit<AnchorPoint, 'id' | 'dataHora' | 'status' | 'createdByUserId' | 'lastModifiedByUserId' | 'archived'>[]) => {
    logger.log('[DEBUG] addMultiplePoints called:', { count: pointsData.length, currentUser: currentUser?.id });
    if (!currentUser) { 
      logger.error('[ERROR] addMultiplePoints: No user selected');
      alert("Por favor, selecione um usuário primeiro."); 
      return; 
    }
    const newPoints = pointsData.map((pointData, index) => ({
      ...pointData,
      id: `${Date.now()}-${index}`,
      dataHora: new Date().toISOString(),
      status: 'Não Testado' as const,
      createdByUserId: currentUser.id,
      lastModifiedByUserId: currentUser.id,
      archived: false,
    }));
    setAllPoints(prev => [...prev, ...newPoints]);
    if (newPoints.length > 0) {
        setLastUsedLocation(newPoints[newPoints.length - 1].localizacao);
    }
    logger.log('[DEBUG] Multiple points added successfully:', newPoints.length);
  }, [currentUser]);

  const updatePointsAndAddTest = useCallback((pontoId: string, testData: Omit<AnchorTestResult, 'id' | 'dataHora' | 'pontoId' | 'createdByUserId'>, pointUpdates: Partial<AnchorPoint>) => {
     logger.log('[DEBUG] updatePointsAndAddTest called:', { pontoId, testData, pointUpdates });
     if (!currentUser) { 
       logger.error('[ERROR] updatePointsAndAddTest: No user selected');
       alert("Por favor, selecione um usuário primeiro."); 
       return; 
     }
    const newTest: AnchorTest = { ...testData, id: Date.now().toString(), pontoId: pontoId, dataHora: new Date().toISOString(), createdByUserId: currentUser.id };
    setAllTests(prevTests => [...prevTests, newTest]);
    setAllPoints(prevPoints => prevPoints.map(p => {
        if (p.id === newTest.pontoId) {
          const hasUpdates = Object.keys(pointUpdates).length > 0;
          return { ...p, ...(hasUpdates ? pointUpdates : {}), status: newTest.resultado, lastModifiedByUserId: currentUser.id };
        }
        return p;
      })
    );
    logger.log('[DEBUG] Point updated and test added successfully');
  }, [currentUser]);
  
  const addFinishedPhotoToTest = useCallback((testId: string, photoDataUrl: string) => {
    logger.log('[DEBUG] addFinishedPhotoToTest called:', { testId, hasPhoto: !!photoDataUrl });
    setAllTests(prevTests => prevTests.map(t => t.id === testId ? { ...t, fotoPronto: photoDataUrl, dataFotoPronto: new Date().toISOString() } : t));
    logger.log('[DEBUG] Finished photo added to test successfully');
  }, []);
  
  const updatePointAndAddOrUpdateTest = useCallback((pointId: string, pointUpdates: Partial<Omit<AnchorPoint, 'id' | 'projectId'>>, testData?: Omit<AnchorTestResult, 'id' | 'dataHora' | 'pontoId' | 'createdByUserId'>) => {
    logger.log('[DEBUG] updatePointAndAddOrUpdateTest called:', { pointId, pointUpdates, hasTestData: !!testData });
    if (!currentUser) { 
      logger.error('[ERROR] updatePointAndAddOrUpdateTest: No user selected');
      alert("Por favor, selecione um usuário primeiro."); 
      return; 
    }
    
    let newStatus: 'Aprovado' | 'Reprovado' | 'Não Testado' | undefined = undefined;
    
    // If test data is provided, create a new test and update status
    if (testData) {
      const newTest: AnchorTest = { 
        ...testData, 
        id: Date.now().toString(), 
        pontoId: pointId, 
        dataHora: new Date().toISOString(), 
        createdByUserId: currentUser.id 
      };
      setAllTests(prevTests => [...prevTests, newTest]);
      newStatus = newTest.resultado;
    }

    // Update the point with new data and potentially new status
    setAllPoints(prevPoints => prevPoints.map(p => {
        if (p.id === pointId) {
            const finalUpdates = { ...p, ...pointUpdates, lastModifiedByUserId: currentUser.id };
            if (newStatus) {
                finalUpdates.status = newStatus;
            }
            if (pointUpdates.localizacao) {
                setLastUsedLocation(pointUpdates.localizacao);
            }
            logger.log('[DEBUG] Point and test updated successfully:', finalUpdates);
            return finalUpdates;
        }
        return p;
    }));
  }, [currentUser]);

  const deletePoint = useCallback((id: string) => {
    logger.log('[DEBUG] deletePoint called:', { id, currentUser: currentUser?.id });
    if (!currentUser) {
      logger.error('[ERROR] deletePoint: No user selected');
      return;
    }
    setAllPoints(prev => prev.map(p => p.id === id ? { ...p, archived: true, archivedAt: new Date().toISOString(), lastModifiedByUserId: currentUser.id } : p));
    logger.log('[DEBUG] Point archived successfully');
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
    addProject,
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
