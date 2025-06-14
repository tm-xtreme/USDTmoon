import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Database, TrendingUp, Coins, ArrowUp } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useGameData } from '@/hooks/useGameData';

const BoostItem = ({ 
    icon, 
    title, 
    description, 
    level, 
    onUpgrade, 
    price, 
    maxLevel, 
    upgrading, 
    canAfford,
    nextLevelBenefit,
    currentBalance
}) => (
    <Card className="bg-white rounded-2xl shadow-md border-2 border-gray-100 hover:border-brand-yellow/30 transition-all duration-300">
        <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-brand-yellow/20 rounded-full">
                        {React.createElement(icon, { className: "h-8 w-8 text-brand-yellow" })}
                    </div>
                    <div>
                        <p className="font-bold text-lg">{title}</p>
                        <p className="text-sm text-gray-500">{description}</p>
                        {nextLevelBenefit && level < maxLevel && (
                            <p className="text-xs text-blue-600 font-semibold mt-1 flex items-center">
                                <ArrowUp className="h-3 w-3 mr-1" />
                                Next: {nextLevelBenefit}
                            </p>
                        )}
                    </div>
                </div>
                <div className="text-right">
                    <div className="flex items-center space-x-1 mb-2">
                        <span className="text-xs text-gray-500">Level</span>
                        <span className="font-bold text-lg text-brand-text">{level}</span>
                        <span className="text-xs text-gray-400">/ {maxLevel}</span>
                    </div>
                </div>
            </div>
            
            {level < maxLevel && (
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Upgrade Cost:</span>
                        <span className="font-bold text-red-600">
                            {price.toFixed(6)} USDT
                        </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Your Balance:</span>
                        <span className={`font-bold ${canAfford ? 'text-green-600' : 'text-red-600'}`}>
                            {currentBalance.toFixed(6)} USDT
                        </span>
                    </div>
                    
                    <Button 
                        onClick={onUpgrade} 
                        disabled={!canAfford || upgrading}
                        className={`w-full font-bold transition-all duration-300 ${
                            canAfford && !upgrading
                                ? 'bg-brand-yellow text-black hover:bg-yellow-400 hover:scale-105 shadow-lg' 
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        {upgrading ? (
                            <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                                <span>Upgrading...</span>
                            </div>
                        ) : canAfford ? (
                            <div className="flex items-center space-x-2">
                                <TrendingUp className="h-4 w-4" />
                                <span>Upgrade to Level {level + 1}</span>
                            </div>
                        ) : (
                            <span>Insufficient Balance</span>
                        )}
                    </Button>
                </div>
            )}
            
            {level >= maxLevel && (
                <div className="text-center py-3">
                    <div className="flex items-center justify-center space-x-2 text-green-600 bg-green-50 rounded-lg p-3">
                        <Coins className="h-5 w-5" />
                        <span className="font-bold">Maximum Level Reached!</span>
                    </div>
                </div>
            )}
        </CardContent>
    </Card>
);

const BoostPage = () => {
    const { toast } = useToast();
    const { data, upgradeMiner, upgradeStorage, MINER_UPGRADE_COSTS, STORAGE_UPGRADE_COSTS, MAX_LEVEL } = useGameData();
    const [upgradingMiner, setUpgradingMiner] = useState(false);
    const [upgradingStorage, setUpgradingStorage] = useState(false);

    if (!data) {
        return (
            <div className="text-center p-10">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-yellow mx-auto"></div>
                <p className="mt-4">Loading Boost Options...</p>
            </div>
        );
    }

    // Calculate next level benefits
    const getNextMinerRate = (currentLevel) => {
        const MINER_RATES = [0, 0.000027, 0.000054, 0.000108];
        return MINER_RATES[currentLevel + 1] || 0;
    };

    const getNextStorageCapacity = (currentLevel) => {
        const STORAGE_CAPACITIES = [0, 0.000027 * 2, 0.000054 * 2, 0.000108 * 2];
        return STORAGE_CAPACITIES[currentLevel + 1] || 0;
    };

    const handleUpgradeMiner = async () => {
        if (upgradingMiner) return;
        
        setUpgradingMiner(true);
        
        try {
            const result = await upgradeMiner();
            
            if (result.success) {
                toast({ 
                    title: "Miner Upgraded! ⚡", 
                    description: `Miner is now Level ${result.level}. Mining rate increased!` 
                });
            } else {
                toast({ 
                    title: "Upgrade Failed", 
                    description: result.reason, 
                    variant: "destructive" 
                });
            }
        } catch (error) {
            console.error('Error upgrading miner:', error);
            toast({ 
                title: "Upgrade Failed", 
                description: "An unexpected error occurred. Please try again.", 
                variant: "destructive" 
            });
        } finally {
            setUpgradingMiner(false);
        }
    };

    const handleUpgradeStorage = async () => {
        if (upgradingStorage) return;
        
        setUpgradingStorage(true);
        
        try {
            const result = await upgradeStorage();
            
            if (result.success) {
                toast({ 
                    title: "Storage Upgraded! 📦", 
                    description: `Storage is now Level ${result.level}. Capacity increased!` 
                });
            } else {
                toast({ 
                    title: "Upgrade Failed", 
                    description: result.reason, 
                    variant: "destructive" 
                });
            }
        } catch (error) {
            console.error('Error upgrading storage:', error);
            toast({ 
                title: "Upgrade Failed", 
                description: "An unexpected error occurred. Please try again.", 
                variant: "destructive" 
            });
        } finally {
            setUpgradingStorage(false);
        }
    };

    const minerUpgradePrice = MINER_UPGRADE_COSTS[data.minerLevel + 1] || 0;
    const storageUpgradePrice = STORAGE_UPGRADE_COSTS[data.storageLevel + 1] || 0;
    const canAffordMiner = data.totalMined >= minerUpgradePrice;
    const canAffordStorage = data.totalMined >= storageUpgradePrice;

    const nextMinerRate = getNextMinerRate(data.minerLevel);
    const nextStorageCapacity = getNextStorageCapacity(data.storageLevel);

    return (
        <div className="p-4 space-y-6 bg-gradient-to-b from-blue-50 to-white min-h-screen">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-3xl font-bold text-brand-text mb-2">Boost Your Mining</h1>
                <p className="text-gray-600">Upgrade your equipment to maximize earnings</p>
                <div className="mt-4 p-4 bg-white rounded-xl shadow-md">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                        <Coins className="h-5 w-5 text-brand-yellow" />
                        <span className="text-sm text-gray-500">Available Balance</span>
                    </div>
                    <p className="text-2xl font-bold text-brand-text">{data.totalMined.toFixed(8)} USDT</p>
                </div>
            </div>

            {/* Current Stats */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="bg-white rounded-xl shadow-md">
                    <CardContent className="p-4 text-center">
                        <Zap className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Mining Rate</p>
                        <p className="font-bold text-lg">{(data.minerRate * 3600).toFixed(8)}</p>
                        <p className="text-xs text-gray-400">USDT/hour</p>
                    </CardContent>
                </Card>
                
                <Card className="bg-white rounded-xl shadow-md">
                    <CardContent className="p-4 text-center">
                        <Database className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Storage Capacity</p>
                        <p className="font-bold text-lg">{data.storageCapacity.toFixed(8)}</p>
                        <p className="text-xs text-gray-400">USDT</p>
                    </CardContent>
                </Card>
            </div>

            {/* Upgrade Options */}
            <div className="space-y-4">
                <BoostItem 
                    icon={Zap}
                    title="Mining Equipment"
                    description={`Current Rate: ${(data.minerRate * 3600).toFixed(8)} USDT/hour`}
                    level={data.minerLevel}
                    onUpgrade={handleUpgradeMiner}
                    price={minerUpgradePrice}
                    maxLevel={MAX_LEVEL}
                    upgrading={upgradingMiner}
                    canAfford={canAffordMiner}
                    currentBalance={data.totalMined}
                    nextLevelBenefit={data.minerLevel < MAX_LEVEL ? `${(nextMinerRate * 3600).toFixed(8)} USDT/hour` : null}
                />
                
                <BoostItem 
                    icon={Database}
                    title="Storage Facility"
                    description={`Current Capacity: ${data.storageCapacity.toFixed(8)} USDT`}
                    level={data.storageLevel}
                    onUpgrade={handleUpgradeStorage}
                    price={storageUpgradePrice}
                    maxLevel={MAX_LEVEL}
                    upgrading={upgradingStorage}
                    canAfford={canAffordStorage}
                    currentBalance={data.totalMined}
                    nextLevelBenefit={data.storageLevel < MAX_LEVEL ? `${nextStorageCapacity.toFixed(8)} USDT capacity` : null}
                />
            </div>

            {/* Upgrade Benefits Info */}
            <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
                <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-3 flex items-center">
                        <TrendingUp className="h-5 w-5 mr-2 text-orange-500" />
                        Upgrade Benefits
                    </h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                            <Zap className="h-4 w-4 text-yellow-500" />
                            <span><strong>Mining Equipment:</strong> Increases your USDT earning rate per hour</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Database className="h-4 w-4 text-blue-500" />
                            <span><strong>Storage Facility:</strong> Increases maximum USDT storage capacity</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Coins className="h-4 w-4 text-green-500" />
                            <span><strong>Higher levels:</strong> Exponentially better returns on investment</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tips */}
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-2 text-blue-800">💡 Pro Tips</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Upgrade mining equipment first for faster earnings</li>
                        <li>• Balance both upgrades for optimal efficiency</li>
                        <li>• Higher levels provide exponentially better returns</li>
                        <li>• Complete tasks to earn upgrade funds faster</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
};

export default BoostPage;
