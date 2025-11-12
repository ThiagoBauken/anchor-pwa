'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FacadeInspection, FacadeSide, PathologyMarker, PathologyCategory, Project } from '@/types';
import {
  getInspectionsForProject,
  getPathologyCategoriesForProject,
  getPathologyMarkersForFacadeSide,
} from '@/app/actions/facade-inspection-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Filter, Eye, Image, MapPin } from 'lucide-react';

// Force dynamic rendering (required for context access)
export const dynamic = 'force-dynamic';

function PatologiasContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');

  const [inspections, setInspections] = useState<FacadeInspection[]>([]);
  const [selectedInspectionId, setSelectedInspectionId] = useState<string>('');
  const [categories, setCategories] = useState<PathologyCategory[]>([]);
  const [allMarkers, setAllMarkers] = useState<PathologyMarker[]>([]);
  const [filteredMarkers, setFilteredMarkers] = useState<PathologyMarker[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFacade, setSelectedFacade] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  // Load inspections when project is loaded
  useEffect(() => {
    if (projectId) {
      loadInspectionsAndCategories();
    }
  }, [projectId]);

  // Load markers when inspection is selected
  useEffect(() => {
    if (selectedInspectionId) {
      loadMarkersForInspection();
    }
  }, [selectedInspectionId]);

  // Filter markers based on search, categories, and facade
  useEffect(() => {
    let filtered = allMarkers;

    // Filter by selected categories
    if (selectedCategories.size > 0) {
      filtered = filtered.filter(m => selectedCategories.has(m.categoryId));
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.description?.toLowerCase().includes(term) ||
        m.observations?.toLowerCase().includes(term) ||
        m.floor?.toLowerCase().includes(term) ||
        m.division?.toLowerCase().includes(term)
      );
    }

    // Filter by facade
    if (selectedFacade !== 'all') {
      filtered = filtered.filter(m => m.facadeSideId === selectedFacade);
    }

    setFilteredMarkers(filtered);
  }, [allMarkers, selectedCategories, searchTerm, selectedFacade]);

  const loadInspectionsAndCategories = async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      const [inspData, catData] = await Promise.all([
        getInspectionsForProject(projectId),
        getPathologyCategoriesForProject(projectId)
      ]);
      setInspections(inspData as any);
      setCategories(catData as any);
      setSelectedCategories(new Set(catData.map(c => c.id)));
    } catch (error) {
      console.error('Error loading inspections:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMarkersForInspection = async () => {
    setLoading(true);
    try {
      const inspection = inspections.find(i => i.id === selectedInspectionId);
      if (!inspection?.facadeSides) return;

      const allMarkersPromises = inspection.facadeSides.map(side =>
        getPathologyMarkersForFacadeSide(side.id)
      );

      const markersArrays = await Promise.all(allMarkersPromises);
      const markers = markersArrays.flat();
      setAllMarkers(markers as any);
    } catch (error) {
      console.error('Error loading markers:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId);
    } else {
      newSelected.add(categoryId);
    }
    setSelectedCategories(newSelected);
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Desconhecida';
  };

  const getCategoryColor = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.color || '#999999';
  };

  const getFacadeName = (facadeSideId: string) => {
    const inspection = inspections.find(i => i.id === selectedInspectionId);
    return inspection?.facadeSides?.find(s => s.id === facadeSideId)?.name || 'Desconhecida';
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">📊 Visualização de Patologias</h1>
          <p className="text-gray-600 mt-1">
            Visualize, filtre e analise todas as patologias identificadas nas inspeções
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>

      {/* Filters Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {projectId ? (
            <>
              {/* Inspection Selection */}
              <div className="space-y-2">
                <Label>Inspeção</Label>
                <Select
                  value={selectedInspectionId}
                  onValueChange={setSelectedInspectionId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma inspeção" />
                  </SelectTrigger>
                  <SelectContent>
                    {inspections.map(inspection => (
                      <SelectItem key={inspection.id} value={inspection.id}>
                        {inspection.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                Por favor, acesse esta página através do botão "Ver Todas as Patologias" na interface de inspeções de fachada.
              </p>
            </div>
          )}

          {/* Search and Facade Filter */}
          {selectedInspectionId && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Buscar</Label>
                  <Input
                    placeholder="Buscar por descrição, observações, andar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fachada</Label>
                  <Select value={selectedFacade} onValueChange={setSelectedFacade}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as fachadas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as fachadas</SelectItem>
                      {inspections
                        .find(i => i.id === selectedInspectionId)
                        ?.facadeSides?.map(side => (
                          <SelectItem key={side.id} value={side.id}>
                            {side.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Category Filters */}
              <div className="space-y-2">
                <Label>Filtrar por Categoria</Label>
                <div className="flex flex-wrap gap-2">
                  {categories.filter(c => c.active).map(category => (
                    <Badge
                      key={category.id}
                      variant={selectedCategories.has(category.id) ? 'default' : 'outline'}
                      className="cursor-pointer px-3 py-1"
                      style={{
                        backgroundColor: selectedCategories.has(category.id)
                          ? category.color
                          : 'transparent',
                        color: selectedCategories.has(category.id) ? 'white' : category.color,
                        borderColor: category.color
                      }}
                      onClick={() => toggleCategory(category.id)}
                    >
                      {category.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {selectedInspectionId && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {filteredMarkers.length} Patologia(s) Encontrada(s)
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedCategories.size === categories.length) {
                  setSelectedCategories(new Set());
                } else {
                  setSelectedCategories(new Set(categories.map(c => c.id)));
                }
              }}
            >
              {selectedCategories.size === categories.length ? 'Desmarcar Todas' : 'Marcar Todas'}
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Carregando...</p>
            </div>
          ) : filteredMarkers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">Nenhuma patologia encontrada com os filtros selecionados.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMarkers.map(marker => {
                const category = categories.find(c => c.id === marker.categoryId);
                return (
                  <Card key={marker.id} className="overflow-hidden">
                    <div
                      className="h-2"
                      style={{ backgroundColor: getCategoryColor(marker.categoryId) }}
                    />
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">
                          {getCategoryName(marker.categoryId)}
                        </CardTitle>
                        <Badge variant="outline">{marker.severity}</Badge>
                      </div>
                      <CardDescription className="flex items-center gap-2 text-xs">
                        <MapPin className="w-3 h-3" />
                        {getFacadeName(marker.facadeSideId)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {marker.floor && (
                        <div>
                          <strong>Andar:</strong> {marker.floor}
                        </div>
                      )}
                      {marker.division && (
                        <div>
                          <strong>Divisão:</strong> {marker.division}
                        </div>
                      )}
                      {marker.description && (
                        <div>
                          <strong>Descrição:</strong>
                          <p className="text-gray-600 mt-1">{marker.description}</p>
                        </div>
                      )}
                      {marker.observations && (
                        <div>
                          <strong>Observações:</strong>
                          <p className="text-gray-600 mt-1 whitespace-pre-wrap">
                            {marker.observations}
                          </p>
                        </div>
                      )}
                      {marker.photos && marker.photos.length > 0 && (
                        <div>
                          <strong className="flex items-center gap-2">
                            <Image className="w-4 h-4" />
                            {marker.photos.length} Foto(s)
                          </strong>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {marker.photos.slice(0, 4).map((photo, idx) => (
                              <img
                                key={idx}
                                src={photo}
                                alt={`Foto ${idx + 1}`}
                                className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                                onClick={() => window.open(photo, '_blank')}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="text-xs text-gray-500 pt-2 border-t">
                        Criado em: {new Date(marker.createdAt).toLocaleString('pt-BR')}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!selectedInspectionId && (
        <Card>
          <CardContent className="py-12 text-center">
            <Eye className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">
              Selecione um projeto e uma inspeção para visualizar as patologias
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function PatologiasPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="text-center py-12">
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    }>
      <PatologiasContent />
    </Suspense>
  );
}
