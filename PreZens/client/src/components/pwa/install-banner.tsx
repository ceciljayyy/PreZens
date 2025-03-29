import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

export default function InstallBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  useEffect(() => {
    // Check if the app is already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    
    // Check if the user has dismissed the banner before
    const hasDismissed = localStorage.getItem('pwa-install-dismissed') === 'true';
    
    if (!isInstalled && !hasDismissed) {
      // Listen for the beforeinstallprompt event
      const handleBeforeInstallPrompt = (e: Event) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later
        setDeferredPrompt(e);
        // Show the install banner
        setIsVisible(true);
      };
      
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);
  
  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // We no longer need the prompt regardless of outcome
    setDeferredPrompt(null);
    
    // Hide the banner
    setIsVisible(false);
    
    // If the user accepted, we hide the banner permanently
    if (outcome === 'accepted') {
      localStorage.setItem('pwa-install-dismissed', 'true');
    }
  };
  
  const handleDismiss = () => {
    // Remember that the user dismissed the banner
    localStorage.setItem('pwa-install-dismissed', 'true');
    setIsVisible(false);
  };
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed bottom-16 left-0 right-0 bg-white shadow-lg p-4 flex items-center justify-between border-t border-gray-200 z-10">
      <div>
        <h4 className="font-medium">Install PreZens App</h4>
        <p className="text-sm text-muted-foreground">For a better check-in experience</p>
      </div>
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          className="mr-2" 
          onClick={handleDismiss}
        >
          <X className="h-5 w-5" />
        </Button>
        <Button onClick={handleInstall} className="animate-pulse">
          <Download className="mr-2 h-4 w-4" />
          Install Now
        </Button>
      </div>
    </div>
  );
}
