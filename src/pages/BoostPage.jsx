
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Database } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useGameData } from '@/hooks/useGameData';

const BoostItem = ({ icon, title, description, level, onUpgrade, price, maxLevel }) => (
    <Card className="bg-white rounded-2xl shadow-md">
        <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
                 <div className="p-3 bg-brand-yellow/30 rounded-full">
                    {React.createElement(icon, { className: "h-8 w-8 text-brand-yellow" })}
                </div>
                <div>
                    <p className="font-bold">{title}</p>
                    <p className="text-sm text-gray-500">{description}</p>
                    {level < maxLevel && <p className="text-xs text-green-600 font-semibold">Cost: {price.toFixed(4)} USDT</p>}
                </div>
            </div>
             <div className="text-right">
                {level < maxLevel ? (
                    <Button onClick={onUpgrade} className="bg-brand-yellow text-black font-bold">Upgrade</Button>
                ) : (
                    <Button disabled className="bg-gray-300 text-gray-500 font-bold">Max Level</Button>
                )}
                <p className="text-xs mt-1">Level {level}</p>
            </div>
        </CardContent>
    </Card>
);

const BoostPage = () => {
    const { toast } = useToast();
    const { data, upgradeMiner, upgradeStorage, MINER_UPGRADE_COSTS, STORAGE_UPGRADE_COSTS, MAX_LEVEL } = useGameData();

    if (!data) return <div className="text-center p-10">Loading...</div>;

    const handleUpgradeMiner = () => {
        const result = upgradeMiner();
        if (result.success) {
            toast({ title: "Miner Upgraded!", description: `Miner is now Level ${result.level}.` });
        } else {
            toast({ title: "Upgrade Failed", description: result.reason, variant: "destructive" });
        }
    };

    const handleUpgradeStorage = () => {
        const result = upgradeStorage();
        if (result.success) {
            toast({ title: "Storage Upgraded!", description: `Storage is now Level ${result.level}.` });
        } else {
            toast({ title: "Upgrade Failed", description: result.reason, variant: "destructive" });
        }
    };

    return (
        <div className="p-4 space-y-6">
             <div className="text-center">
                <h1 className="text-2xl font-bold">Boost Your Mining</h1>
                <p className="text-gray-600">Upgrade your gear to earn faster.</p>
            </div>
            <div className="space-y-4">
                <BoostItem 
                    icon={Zap}
                    title="Miner"
                    description={`Current Rate: ${(data.minerRate * 3600).toFixed(8)} USDT/hour`}
                    level={data.minerLevel}
                    onUpgrade={handleUpgradeMiner}
                    price={MINER_UPGRADE_COSTS[data.minerLevel + 1] || 0}
                    maxLevel={MAX_LEVEL}
                />
                 <BoostItem 
                    icon={Database}
                    title="Storage"
                    description={`Current Capacity: ${data.storageCapacity.toFixed(8)} USDT`}
                    level={data.storageLevel}
                    onUpgrade={handleUpgradeStorage}
                    price={STORAGE_UPGRADE_COSTS[data.storageLevel + 1] || 0}
                    maxLevel={MAX_LEVEL}
                />
            </div>
        </div>
    );
};

export default BoostPage;
