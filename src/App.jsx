import React from 'react';
import { BrowserRouter, Routes, Route, Outlet, useNavigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import BottomNav from '@/components/BottomNav';
import HomePage from '@/pages/HomePage';
import ReferralsPage from '@/pages/ReferralsPage';
import TasksPage from '@/pages/TasksPage';
import BoostPage from '@/pages/BoostPage';
import LeaderboardPage from '@/pages/LeaderboardPage';
import AdminLayout from '@/pages/Admin/AdminLayout';
import ClaimPage from '@/pages/ClaimPage';
import DepositPage from '@/pages/DepositPage';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { QrCode, X, ArrowLeft } from 'lucide-react';
import QRCode from "qrcode.react";
import { useGameData } from '@/hooks/useGameData';

const AppLayout = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: gameData, loading } = useGameData();
  const [isQrSheetOpen, setQrSheetOpen] = React.useState(false);
  const depositAddress = "0x10aDaB723498E5d6258542Ee6717458a1E3F6590";

  const handleCopy = () => {
    navigator.clipboard.writeText(depositAddress);
    toast({
      title: "Copied!",
      description: "Deposit address copied to clipboard.",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow mx-auto"></div>
          <p className="mt-4 text-brand-text">Loading your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg font-sans">
      <header className="fixed top-0 left-0 right-0 z-10 bg-brand-bg/80 backdrop-blur-sm p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
            <img  alt="USDT coin logo" className="h-8 w-8" src="https://images.unsplash.com/photo-1694279901445-2007392c4bf9" />
            <h1 className="text-xl font-bold text-brand-text">MOONUSDT</h1>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-brand-text">
            {gameData ? `${gameData.totalMined?.toFixed(6) || '0.000000'} USDT` : '0.000000 USDT'}
          </div>
          <Button variant="outline" className="rounded-full bg-brand-yellow border-none font-bold" onClick={() => navigate('/claim')}>Claim</Button>
          <Button variant="ghost" size="icon" onClick={() => setQrSheetOpen(true)}>
            <QrCode className="h-6 w-6 text-brand-text" />
          </Button>
        </div>
      </header>
      <main className="flex-grow pt-20 pb-24">
        <Outlet />
      </main>
      <BottomNav />
      <Toaster />
      <Sheet open={isQrSheetOpen} onOpenChange={setQrSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl bg-brand-bg text-brand-text p-6 h-auto max-h-[90vh] flex flex-col">
            <SheetHeader className="text-center mb-4">
                <SheetTitle className="text-2xl font-bold">Deposit USDT</SheetTitle>
                <SheetDescription className="text-sm">
                    Only send USDT (BEP20) to this address.
                </SheetDescription>
            </SheetHeader>
            <div className="flex-grow flex flex-col items-center justify-center space-y-4 py-4 overflow-y-auto">
                <div className="p-4 bg-white rounded-lg border">
                    <QRCode value={depositAddress} size={Math.min(window.innerWidth * 0.6, 200)} />
                </div>
                <div className="w-full max-w-xs p-3 bg-white/50 rounded-lg flex items-center justify-between">
                    <span className="text-sm font-mono truncate">{depositAddress}</span>
                    <Button variant="ghost" size="sm" onClick={handleCopy}>Copy</Button>
                </div>
                <ul className="text-xs text-gray-500 space-y-2 list-disc list-inside max-w-xs">
                    <li>We only accept USDT deposits through the BNB Smart Chain (BEP20).</li>
                    <li>The deposit amount will be credited to your account after network confirmation.</li>
                    <li>We are not responsible for any incorrect deposits involving other assets.</li>
                </ul>
            </div>
             <Button onClick={() => setQrSheetOpen(false)} variant="ghost" className="absolute top-4 right-4 rounded-full p-2 h-auto w-auto">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
            </Button>
        </SheetContent>
      </Sheet>
    </div>
  );
};

const PageWithHeader = ({ title, children, showBackButton = true }) => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col min-h-screen bg-brand-bg font-sans">
      <header className="fixed top-0 left-0 right-0 z-10 bg-brand-bg/80 backdrop-blur-sm p-4 flex items-center">
        {showBackButton && (
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2">
            <ArrowLeft className="h-6 w-6 text-brand-text" />
          </Button>
        )}
        <h1 className="text-xl font-bold text-brand-text">{title}</h1>
      </header>
      <main className="flex-grow pt-20 pb-4">
        {children}
      </main>
      <Toaster />
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminLayout />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/referrals" element={<ReferralsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/boost" element={<BoostPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
        </Route>
        <Route path="/claim" element={<PageWithHeader title="Claim Storage"><ClaimPage /></PageWithHeader>} />
        <Route path="/deposit" element={<PageWithHeader title="Deposit USDT"><DepositPage /></PageWithHeader>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
        
