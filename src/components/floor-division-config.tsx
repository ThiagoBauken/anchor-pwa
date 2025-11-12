'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Plus, X, Settings, Check, Grid3x3 } from 'lucide-react';
import { Badge } from './ui/badge';

interface FloorDivisionConfigProps {
  availableFloors: string[];
  availableDivisions: string[];
  floorPositions?: Record<string, number>;
  divisionPositions?: Record<string, number>;
  onUpdateConfig: (floors: string[], divisions: string[], floorPositions: Record<string, number>, divisionPositions: Record<string, number>) => Promise<void>;
  disabled?: boolean;
}

export function FloorDivisionConfig({
  availableFloors,
  availableDivisions,
  floorPositions = {},
  divisionPositions = {},
  onUpdateConfig,
  disabled = false
}: FloorDivisionConfigProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [floors, setFloors] = useState<string[]>(availableFloors);
  const [divisions, setDivisions] = useState<string[]>(availableDivisions);
  const [floorPos, setFloorPos] = useState<Record<string, number>>(floorPositions);
  const [divisionPos, setDivisionPos] = useState<Record<string, number>>(divisionPositions);
  const [newFloor, setNewFloor] = useState('');
  const [newDivision, setNewDivision] = useState('');

  // Sync state with props when modal opens
  useEffect(() => {
    if (isOpen) {
      setFloors(availableFloors);
      setDivisions(availableDivisions);
      setFloorPos(floorPositions);
      setDivisionPos(divisionPositions);
    }
  }, [isOpen, availableFloors, availableDivisions, floorPositions, divisionPositions]);

  const handleAddFloor = () => {
    if (newFloor.trim() && !floors.includes(newFloor.trim())) {
      const newFloorName = newFloor.trim();
      setFloors([...floors, newFloorName]);
      // Set default position at 50% if not set
      if (!floorPos[newFloorName]) {
        setFloorPos({ ...floorPos, [newFloorName]: 50 });
      }
      setNewFloor('');
    }
  };

  const handleAddDivision = () => {
    if (newDivision.trim() && !divisions.includes(newDivision.trim())) {
      const newDivisionName = newDivision.trim();
      setDivisions([...divisions, newDivisionName]);
      // Set default position at 50% if not set
      if (!divisionPos[newDivisionName]) {
        setDivisionPos({ ...divisionPos, [newDivisionName]: 50 });
      }
      setNewDivision('');
    }
  };

  const handleRemoveFloor = (floor: string) => {
    setFloors(floors.filter(f => f !== floor));
    const newPos = { ...floorPos };
    delete newPos[floor];
    setFloorPos(newPos);
  };

  const handleRemoveDivision = (division: string) => {
    setDivisions(divisions.filter(d => d !== division));
    const newPos = { ...divisionPos };
    delete newPos[division];
    setDivisionPos(newPos);
  };

  const handleFloorPositionChange = (floor: string, position: number) => {
    setFloorPos({ ...floorPos, [floor]: Math.max(0, Math.min(100, position)) });
  };

  const handleDivisionPositionChange = (division: string, position: number) => {
    setDivisionPos({ ...divisionPos, [division]: Math.max(0, Math.min(100, position)) });
  };

  const handleAutoDistributeFloors = () => {
    if (floors.length === 0) return;
    const spacing = 100 / (floors.length + 1);
    const newPos: Record<string, number> = {};
    floors.forEach((floor, index) => {
      newPos[floor] = Math.round(spacing * (index + 1));
    });
    setFloorPos(newPos);
  };

  const handleAutoDistributeDivisions = () => {
    if (divisions.length === 0) return;
    const spacing = 100 / (divisions.length + 1);
    const newPos: Record<string, number> = {};
    divisions.forEach((division, index) => {
      newPos[division] = Math.round(spacing * (index + 1));
    });
    setDivisionPos(newPos);
  };

  const handleSave = async () => {
    await onUpdateConfig(floors, divisions, floorPos, divisionPos);
    setIsOpen(false);
  };

  const handleQuickSetup = (type: 'numeric' | 'alphanumeric') => {
    if (type === 'numeric') {
      // Andares: 1, 2, 3... 10
      const newFloors = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
      setFloors(newFloors);
      // Divisões: D1, D2... D7
      const newDivisions = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'];
      setDivisions(newDivisions);
      // Auto-distribute positions
      const floorSpacing = 100 / (newFloors.length + 1);
      const newFloorPos: Record<string, number> = {};
      newFloors.forEach((floor, index) => {
        newFloorPos[floor] = Math.round(floorSpacing * (index + 1));
      });
      setFloorPos(newFloorPos);

      const divSpacing = 100 / (newDivisions.length + 1);
      const newDivPos: Record<string, number> = {};
      newDivisions.forEach((division, index) => {
        newDivPos[division] = Math.round(divSpacing * (index + 1));
      });
      setDivisionPos(newDivPos);
    } else {
      // Andares: A1, A2... A10
      const newFloors = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10'];
      setFloors(newFloors);
      // Divisões: D1, D2... D7
      const newDivisions = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'];
      setDivisions(newDivisions);
      // Auto-distribute positions
      const floorSpacing = 100 / (newFloors.length + 1);
      const newFloorPos: Record<string, number> = {};
      newFloors.forEach((floor, index) => {
        newFloorPos[floor] = Math.round(floorSpacing * (index + 1));
      });
      setFloorPos(newFloorPos);

      const divSpacing = 100 / (newDivisions.length + 1);
      const newDivPos: Record<string, number> = {};
      newDivisions.forEach((division, index) => {
        newDivPos[division] = Math.round(divSpacing * (index + 1));
      });
      setDivisionPos(newDivPos);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Settings className="w-4 h-4 mr-2" />
          Configurar Andares e Divisões
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>⚙️ Configurar Linhas Guia da Fachada</DialogTitle>
          <DialogDescription>
            Defina os andares (linhas verticais) e divisões (linhas horizontais) com suas posições.
            Estas linhas guia aparecem no canvas para auxiliar o posicionamento das patologias.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Configuração Rápida</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSetup('numeric')}
              >
                Padrão Numérico (1-10, D1-D7)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSetup('alphanumeric')}
              >
                Padrão Alfanumérico (A1-A10, D1-D7)
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-6">
            {/* Andares (Horizontal Lines - Floor Levels) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  🏢 Andares (Linhas Horizontais)
                  <Badge variant="outline" className="text-blue-600">Níveis</Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Linhas horizontais marcando níveis/andares da fachada. Posição: % da altura (topo → base).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: 7 ou A7"
                    value={newFloor}
                    onChange={(e) => setNewFloor(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddFloor()}
                  />
                  <Button size="sm" onClick={handleAddFloor}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAutoDistributeFloors}
                  disabled={floors.length === 0}
                  className="w-full"
                >
                  <Grid3x3 className="w-4 h-4 mr-2" />
                  Auto-distribuir {floors.length} Andares
                </Button>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {floors.map((floor) => (
                    <div key={floor} className="flex items-center gap-2 p-2 border rounded-lg bg-blue-50/50">
                      <Badge variant="secondary" className="min-w-16 justify-center">
                        {floor}
                      </Badge>
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={floorPos[floor] || 50}
                          onChange={(e) => handleFloorPositionChange(floor, Number(e.target.value))}
                          className="w-20 h-8"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                        <div className="flex-1 h-2 bg-gradient-to-r from-blue-200 to-blue-400 rounded-full relative">
                          <div
                            className="absolute w-1 h-full bg-blue-600 rounded-full"
                            style={{ left: `${floorPos[floor] || 50}%` }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFloor(floor)}
                        className="ml-1 hover:text-destructive p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {floors.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Nenhum andar configurado</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Divisões (Vertical Lines - Sections) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  📍 Divisões (Linhas Verticais)
                  <Badge variant="outline" className="text-green-600">Seções</Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Linhas verticais dividindo a fachada em seções. Posição: % da largura (esquerda → direita).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: D1 ou Setor A"
                    value={newDivision}
                    onChange={(e) => setNewDivision(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddDivision()}
                  />
                  <Button size="sm" onClick={handleAddDivision}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAutoDistributeDivisions}
                  disabled={divisions.length === 0}
                  className="w-full"
                >
                  <Grid3x3 className="w-4 h-4 mr-2" />
                  Auto-distribuir {divisions.length} Divisões
                </Button>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {divisions.map((division) => (
                    <div key={division} className="flex items-center gap-2 p-2 border rounded-lg bg-green-50/50">
                      <Badge variant="secondary" className="min-w-16 justify-center">
                        {division}
                      </Badge>
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={divisionPos[division] || 50}
                          onChange={(e) => handleDivisionPositionChange(division, Number(e.target.value))}
                          className="w-20 h-8"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                        <div className="flex-1 h-2 bg-gradient-to-r from-green-200 to-green-400 rounded-full relative">
                          <div
                            className="absolute w-1 h-full bg-green-600 rounded-full"
                            style={{ left: `${divisionPos[division] || 50}%` }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveDivision(division)}
                        className="ml-1 hover:text-destructive p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {divisions.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Nenhuma divisão configurada</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              <Check className="w-4 h-4 mr-2" />
              Salvar Configuração
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
