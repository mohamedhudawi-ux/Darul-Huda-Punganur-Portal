import React, { useState } from 'react';
import { Download, Smartphone, Laptop, ExternalLink, Share2, PlusSquare, X, CheckCircle2, Sparkles, Monitor } from 'lucide-react';
import { useStore } from '../../lib/store';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  installPrompt: any;
}

export function InstallModal({ isOpen, onClose, installPrompt }: InstallModalProps) {
  const { settings } = useStore();
  const [activePlatform, setActivePlatform] = useState<'chrome' | 'ios' | 'desktop'>('chrome');
  const [isInstalled, setIsInstalled] = useState(false);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
  };

  const handleOpenStandalone = () => {
    window.open(window.location.href, '_blank');
  };

  const isIframe = window.self !== window.top;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 text-slate-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-slate-900 font-black text-xl shadow-md">
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-cover" />
              ) : (
                'G'
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">Install Campus Portal</h3>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  PWA
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">Add to your Phone, Tablet, or PC as a standalone app</p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Quick Install Action if browser supports prompt */}
          {installPrompt && !isInstalled && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-emerald-950 text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" /> One-Click Install Ready!
                </p>
                <p className="text-xs text-emerald-800 mt-0.5">Your browser supports instant app installation.</p>
              </div>
              <button
                onClick={handleNativeInstall}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md transition-all shrink-0 flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Install Now
              </button>
            </div>
          )}

          {isInstalled && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="font-bold text-emerald-950 text-sm">App Installed Successfully!</p>
              <p className="text-xs text-emerald-700 mt-1">You can now launch the portal from your home screen or application menu.</p>
            </div>
          )}

          {/* Iframe detection notice */}
          {isIframe && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3">
              <ExternalLink className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-bold text-amber-900">Running inside Preview Window</p>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                  Web browser install prompts are disabled inside frame views. Open in a dedicated tab to install directly to your device.
                </p>
                <button
                  onClick={handleOpenStandalone}
                  className="mt-2 text-xs font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open in Full Browser Tab
                </button>
              </div>
            </div>
          )}

          {/* Platform Selector Tabs */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Step-by-Step Device Instructions</p>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setActivePlatform('chrome')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                  activePlatform === 'chrome'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-blue-600" /> Android / Chrome
              </button>
              <button
                onClick={() => setActivePlatform('ios')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                  activePlatform === 'ios'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Share2 className="w-3.5 h-3.5 text-indigo-600" /> iPhone / iPad
              </button>
              <button
                onClick={() => setActivePlatform('desktop')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                  activePlatform === 'desktop'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Monitor className="w-3.5 h-3.5 text-slate-700" /> PC / Mac
              </button>
            </div>
          </div>

          {/* Platform Content Guide */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2.5">
            {activePlatform === 'chrome' && (
              <>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                  <p className="text-slate-700 leading-relaxed">Open this link in <strong>Google Chrome</strong> or <strong>Edge</strong> on your Android phone.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                  <p className="text-slate-700 leading-relaxed">Tap the <strong>three dots menu (⋮)</strong> at the top-right corner of the browser.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                  <p className="text-slate-700 leading-relaxed">Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong> and tap Install.</p>
                </div>
              </>
            )}

            {activePlatform === 'ios' && (
              <>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                  <p className="text-slate-700 leading-relaxed">Open this link in <strong>Safari</strong> on your iPhone or iPad.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                  <p className="text-slate-700 leading-relaxed">Tap the <strong>Share button</strong> <Share2 className="w-3.5 h-3.5 inline text-blue-600" /> at the bottom bar of Safari.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                  <p className="text-slate-700 leading-relaxed">Scroll down and tap <strong>"Add to Home Screen" <PlusSquare className="w-3.5 h-3.5 inline text-slate-700" /></strong>, then tap Add in the top-right.</p>
                </div>
              </>
            )}

            {activePlatform === 'desktop' && (
              <>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                  <p className="text-slate-700 leading-relaxed">Open this portal in <strong>Chrome</strong>, <strong>Edge</strong>, or <strong>Brave</strong> on your desktop.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                  <p className="text-slate-700 leading-relaxed">Look for the <strong>Install icon <Download className="w-3.5 h-3.5 inline text-blue-600" /></strong> in the right end of the browser URL bar.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                  <p className="text-slate-700 leading-relaxed">Click <strong>Install</strong> to add it to your Desktop and Applications menu.</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={handleOpenStandalone}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" /> Launch in New Tab
          </button>
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
