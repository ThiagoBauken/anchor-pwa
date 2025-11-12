"use client";

import { useEffect, useMemo, useState } from "react";
import { useAnchorData } from '@/context/AnchorDataContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

interface CreateProgressionDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function CreateProgressionDialog({ isOpen, onOpenChange }: CreateProgressionDialogProps) {
    const {
        points,
        currentProject,
        locations,
        lastUsedLocation,
        addPoint,
        floorPlans,
        currentFloorPlan
    } = useAnchorData();
    
    const { toast } = useToast();
    
    // Estados do formulário
    const [mode, setMode] = useState<'between' | 'new'>('between');
    const [startPointId, setStartPointId] = useState<string>('');
    const [endPointId, setEndPointId] = useState<string>('');
    const [numPoints, setNumPoints] = useState(3);
    const [startNumber, setStartNumber] = useState('');
    const [prefix, setPrefix] = useState('');
    const [suffix, setSuffix] = useState('');
    
    // Pontos disponíveis ordenados
    const availablePoints = useMemo(() => {
        return points
            .filter(p => !p.archived && p.projectId === currentProject?.id)
            .sort((a, b) => {
                const numA = parseInt(a.numeroPonto.replace(/\D/g, ''), 10) || 0;
                const numB = parseInt(b.numeroPonto.replace(/\D/g, ''), 10) || 0;
                return numA - numB;
            });
    }, [points, currentProject]);

    // Helper para formatar nome do ponto com contexto
    const formatPointLabel = (point: typeof points[0]) => {
        const floorPlan = floorPlans?.find(fp => fp.id === point.floorPlanId);
        const floorPlanName = floorPlan ? ` | ${floorPlan.name}` : '';
        const location = point.localizacao || 'Sem localização';
        return `#${point.numeroPonto} - ${location}${floorPlanName}`;
    };

    // Auto-switch to 'new' mode if not enough points for 'between' mode
    useEffect(() => {
        if (mode === 'between' && availablePoints.length < 2) {
            setMode('new');
        }
    }, [mode, availablePoints.length]);
    
    // Pontos selecionados
    const startPoint = useMemo(() => 
        availablePoints.find(p => p.id === startPointId), 
        [availablePoints, startPointId]
    );
    
    const endPoint = useMemo(() => 
        availablePoints.find(p => p.id === endPointId), 
        [availablePoints, endPointId]
    );
    
    // Calcular distância entre pontos
    const distance = useMemo(() => {
        if (!startPoint || !endPoint) return null;
        
        return Math.sqrt(
            Math.pow(endPoint.posicaoX - startPoint.posicaoX, 2) + 
            Math.pow(endPoint.posicaoY - startPoint.posicaoY, 2)
        );
    }, [startPoint, endPoint]);
    
    // Preview dos números que serão criados
    const previewNumbers = useMemo(() => {
        const numbers = [];

        if (mode === 'between' && startPoint && endPoint) {
            // Modo entre pontos: gerar números intermediários
            const startNum = parseInt(startPoint.numeroPonto.replace(/\D/g, ''), 10);
            const endNum = parseInt(endPoint.numeroPonto.replace(/\D/g, ''), 10);

            if (startNum && endNum && endNum > startNum) {
                // Tentar distribuir números uniformemente entre os pontos
                const step = (endNum - startNum) / (numPoints + 1);
                for (let i = 1; i <= numPoints; i++) {
                    const num = Math.round(startNum + step * i);
                    numbers.push(`${prefix}${num}${suffix}`);
                }
            } else {
                // Se não for possível, usar decimais ou letras
                for (let i = 1; i <= numPoints; i++) {
                    numbers.push(`${startPoint.numeroPonto}.${i}`);
                }
            }
        } else if (mode === 'new') {
            // Modo novos pontos
            const start = parseInt(startNumber) || 1;
            for (let i = 0; i < numPoints; i++) {
                numbers.push(`${prefix}${start + i}${suffix}`);
            }
        }

        return numbers;
    }, [mode, startPoint, endPoint, numPoints, startNumber, prefix, suffix]);

    // Detectar números duplicados
    const duplicateCheck = useMemo(() => {
        if (previewNumbers.length === 0) return { hasDuplicates: false, duplicates: [], available: [] };

        const existingNumbers = new Set(
            points
                .filter(p => p.projectId === currentProject?.id && !p.archived)
                .map(p => p.numeroPonto)
        );

        const duplicates = previewNumbers.filter(num => existingNumbers.has(num));
        const available = previewNumbers.filter(num => !existingNumbers.has(num));

        return {
            hasDuplicates: duplicates.length > 0,
            duplicates,
            available,
            allDuplicate: duplicates.length === previewNumbers.length
        };
    }, [previewNumbers, points, currentProject]);

    // Encontrar próximos números disponíveis
    const findNextAvailableNumbers = (count: number): string[] => {
        const existingNumbers = new Set(
            points
                .filter(p => p.projectId === currentProject?.id && !p.archived)
                .map(p => p.numeroPonto)
        );

        const result = [];
        let current = 1;

        // Extrair prefixo e sufixo do primeiro número do preview
        const firstPreview = previewNumbers[0] || '';
        const match = firstPreview.match(/^([^\d]*)(\d+)(.*)$/);
        const currentPrefix = match ? match[1] : prefix;
        const currentSuffix = match ? match[3] : suffix;

        while (result.length < count) {
            const candidate = `${currentPrefix}${current}${currentSuffix}`;
            if (!existingNumbers.has(candidate)) {
                result.push(candidate);
            }
            current++;

            // Segurança: evitar loop infinito
            if (current > 10000) break;
        }

        return result;
    };
    
    const handleConfirm = async (strategy: 'create-all' | 'skip-duplicates' | 'use-next-available' = 'create-all') => {
        if (!currentProject) {
            toast({
                title: "Erro",
                description: "Nenhum projeto selecionado.",
                variant: "destructive"
            });
            return;
        }

        if (mode === 'between' && (!startPoint || !endPoint)) {
            toast({
                title: "Erro",
                description: "Selecione os pontos inicial e final.",
                variant: "destructive"
            });
            return;
        }

        if (mode === 'new' && !currentFloorPlan) {
            toast({
                title: "Erro",
                description: "Selecione uma planta baixa antes de criar novos pontos.",
                variant: "destructive"
            });
            return;
        }

        try {
            const newPoints = [];

            // Determinar quais números usar baseado na estratégia
            let numbersToCreate: string[];
            if (strategy === 'skip-duplicates') {
                numbersToCreate = duplicateCheck.available;
                if (numbersToCreate.length === 0) {
                    toast({
                        title: "Aviso",
                        description: "Todos os números já existem. Nenhum ponto foi criado.",
                        variant: "destructive"
                    });
                    return;
                }
            } else if (strategy === 'use-next-available') {
                numbersToCreate = findNextAvailableNumbers(numPoints);
            } else {
                numbersToCreate = previewNumbers;
            }

            for (let i = 0; i < numbersToCreate.length; i++) {
                let x, y;

                if (mode === 'between' && startPoint && endPoint) {
                    // Calcular posição interpolada
                    // Usar a fração baseada no total original, não no número de pontos a criar
                    const originalIndex = previewNumbers.indexOf(numbersToCreate[i]);
                    const fraction = (originalIndex + 1) / (previewNumbers.length + 1);
                    x = startPoint.posicaoX + fraction * (endPoint.posicaoX - startPoint.posicaoX);
                    y = startPoint.posicaoY + fraction * (endPoint.posicaoY - startPoint.posicaoY);
                } else {
                    // Posição padrão para novos pontos
                    x = 100 + i * 50;
                    y = 100;
                }

                const currentLocation = locations.find(l => l.id === lastUsedLocation);

                // Determinar floorPlanId baseado no modo
                let floorPlanId: string | undefined;
                if (mode === 'between' && startPoint) {
                    // Modo entre pontos: usa a mesma planta do ponto inicial
                    floorPlanId = startPoint.floorPlanId;
                } else if (currentFloorPlan) {
                    // Modo nova sequência: usa a planta atualmente selecionada
                    floorPlanId = currentFloorPlan.id;
                }

                const pointData = {
                    projectId: currentProject.id,
                    numeroPonto: numbersToCreate[i],
                    posicaoX: x,
                    posicaoY: y,
                    localizacao: currentLocation?.name || startPoint?.localizacao || 'Não definido',
                    floorPlanId: floorPlanId,
                    status: 'Não Testado' as const,
                    archived: false
                };

                addPoint(pointData);
                newPoints.push(pointData);
            }

            // Determinar o nome da planta baixa onde os pontos foram criados
            let floorPlanName = 'Sem planta';
            if (mode === 'between' && startPoint) {
                const floorPlan = floorPlans?.find(fp => fp.id === startPoint.floorPlanId);
                floorPlanName = floorPlan?.name || 'Sem planta';
            } else if (currentFloorPlan) {
                floorPlanName = currentFloorPlan.name;
            }

            // Mensagem de sucesso baseada na estratégia
            let successMessage = `${numbersToCreate.length} pontos criados com sucesso na planta "${floorPlanName}".`;
            if (strategy === 'skip-duplicates' && duplicateCheck.duplicates.length > 0) {
                successMessage += ` ${duplicateCheck.duplicates.length} número(s) duplicado(s) foram pulados.`;
            } else if (strategy === 'use-next-available') {
                successMessage = `${numbersToCreate.length} pontos criados usando próximos números disponíveis na planta "${floorPlanName}".`;
            }

            toast({
                title: "Sucesso!",
                description: successMessage
            });

            onOpenChange(false);
            resetForm();
            
        } catch (error) {
            console.error('Erro ao criar progressão:', error);
            toast({ 
                title: "Erro", 
                description: "Falha ao criar pontos.", 
                variant: "destructive" 
            });
        }
    };
    
    const resetForm = () => {
        setStartPointId('');
        setEndPointId('');
        setNumPoints(3);
        setStartNumber('');
        setPrefix('');
        setSuffix('');
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>🔢 Criar Progressão de Pontos</DialogTitle>
                    <DialogDescription>
                        Crie múltiplos pontos de forma automática, entre pontos existentes ou com nova numeração.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                    {/* Aviso se não houver pontos */}
                    {availablePoints.length === 0 && (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Nenhum ponto disponível no projeto atual. Crie alguns pontos primeiro para usar o modo "Entre pontos".
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Modo de criação */}
                    <div className="space-y-3">
                        <Label>Modo de Criação</Label>
                        <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'between' | 'new')}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="between" id="between" disabled={availablePoints.length < 2} />
                                <Label htmlFor="between" className={`font-normal ${availablePoints.length < 2 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                    Adicionar pontos ENTRE dois pontos existentes {availablePoints.length < 2 && '(requer 2+ pontos)'}
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="new" id="new" />
                                <Label htmlFor="new" className="font-normal cursor-pointer">
                                    Criar nova sequência de pontos
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                    
                    {mode === 'between' ? (
                        <>
                            {/* Seleção de pontos inicial e final */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Ponto Inicial</Label>
                                    <Select value={startPointId} onValueChange={setStartPointId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availablePoints.length > 0 ? (
                                                availablePoints.map(point => (
                                                    <SelectItem
                                                        key={point.id}
                                                        value={point.id}
                                                        disabled={point.id === endPointId}
                                                    >
                                                        {formatPointLabel(point)}
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="empty" disabled>
                                                    Nenhum ponto disponível
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>Ponto Final</Label>
                                    <Select value={endPointId} onValueChange={setEndPointId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availablePoints.length > 0 ? (
                                                availablePoints.map(point => (
                                                    <SelectItem
                                                        key={point.id}
                                                        value={point.id}
                                                        disabled={point.id === startPointId}
                                                    >
                                                        {formatPointLabel(point)}
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="empty" disabled>
                                                    Nenhum ponto disponível
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            {/* Visualização da progressão */}
                            {startPoint && endPoint && (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold">#{startPoint.numeroPonto}</span>
                                            <ArrowRight className="h-4 w-4" />
                                            <span className="text-sm">
                                                {previewNumbers.join(', ')}
                                            </span>
                                            <ArrowRight className="h-4 w-4" />
                                            <span className="font-bold">#{endPoint.numeroPonto}</span>
                                        </div>
                                        {distance && (
                                            <p className="text-xs mt-2">
                                                Distância: {distance.toFixed(0)} pixels
                                            </p>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Configuração para nova sequência */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Prefixo (opcional)</Label>
                                    <Input 
                                        value={prefix}
                                        onChange={(e) => setPrefix(e.target.value)}
                                        placeholder="Ex: P"
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>Número Inicial</Label>
                                    <Input 
                                        type="number"
                                        value={startNumber}
                                        onChange={(e) => setStartNumber(e.target.value)}
                                        placeholder="Ex: 100"
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>Sufixo (opcional)</Label>
                                    <Input 
                                        value={suffix}
                                        onChange={(e) => setSuffix(e.target.value)}
                                        placeholder="Ex: A"
                                    />
                                </div>
                            </div>

                            {/* Aviso quando não há planta baixa selecionada */}
                            {!currentFloorPlan && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Nenhuma planta baixa selecionada! Selecione uma planta na aba Mapa antes de criar pontos.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Indicador da planta baixa selecionada */}
                            {currentFloorPlan && (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        <span className="font-medium">Planta selecionada: </span>
                                        {currentFloorPlan.name}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Preview da numeração */}
                            {previewNumbers.length > 0 && (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        <span className="font-medium">Pontos a criar: </span>
                                        {previewNumbers.join(', ')}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </>
                    )}

                    {/* Alerta de números duplicados */}
                    {duplicateCheck.hasDuplicates && previewNumbers.length > 0 && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <div className="space-y-2">
                                    <p className="font-medium">
                                        ⚠️ {duplicateCheck.duplicates.length} número(s) já existe(m) neste projeto:
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {duplicateCheck.duplicates.map((num) => (
                                            <span key={num} className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm font-medium">
                                                {num}
                                            </span>
                                        ))}
                                    </div>
                                    {duplicateCheck.available.length > 0 && (
                                        <p className="text-sm mt-2">
                                            {duplicateCheck.available.length} número(s) disponível(is): {duplicateCheck.available.join(', ')}
                                        </p>
                                    )}
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}
                    
                    {/* Quantidade de pontos */}
                    <div className="space-y-2">
                        <Label>Quantidade de Pontos</Label>
                        <Input 
                            type="number"
                            min="1"
                            max="50"
                            value={numPoints}
                            onChange={(e) => setNumPoints(parseInt(e.target.value) || 1)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Máximo de 50 pontos por vez
                        </p>
                    </div>
                </div>
                
                <DialogFooter>
                    {duplicateCheck.hasDuplicates ? (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            {!duplicateCheck.allDuplicate && (
                                <Button
                                    variant="secondary"
                                    onClick={() => handleConfirm('skip-duplicates')}
                                    disabled={
                                        (mode === 'between' && (!startPointId || !endPointId)) ||
                                        (mode === 'new' && !currentFloorPlan) ||
                                        numPoints < 1 ||
                                        numPoints > 50
                                    }
                                >
                                    Pular Duplicados ({duplicateCheck.available.length} pontos)
                                </Button>
                            )}
                            <Button
                                onClick={() => handleConfirm('use-next-available')}
                                disabled={
                                    (mode === 'between' && (!startPointId || !endPointId)) ||
                                    (mode === 'new' && !currentFloorPlan) ||
                                    numPoints < 1 ||
                                    numPoints > 50
                                }
                            >
                                Usar Próximos Disponíveis
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => handleConfirm('create-all')}
                                disabled={
                                    (mode === 'between' && (!startPointId || !endPointId)) ||
                                    (mode === 'new' && !currentFloorPlan) ||
                                    numPoints < 1 ||
                                    numPoints > 50
                                }
                            >
                                Criar {numPoints} Pontos
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}