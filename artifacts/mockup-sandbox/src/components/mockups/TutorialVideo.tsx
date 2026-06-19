import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Home, Briefcase, Car, Star, Calendar, MapPin, CheckCircle, Truck, ArrowRight, User } from 'lucide-react';

const SCENE_DURATIONS = [6000, 9000, 9000, 9000, 9000, 9000, 9000];

export function TutorialVideo() {
  const [currentScene, setCurrentScene] = useState(0);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const playScene = (index: number) => {
      timeoutId = setTimeout(() => {
        const nextScene = (index + 1) % SCENE_DURATIONS.length;
        setCurrentScene(nextScene);
        playScene(nextScene);
      }, SCENE_DURATIONS[index]);
    };
    
    playScene(currentScene);
    return () => clearTimeout(timeoutId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full h-screen overflow-hidden relative font-sans" dir="rtl" style={{ fontFamily: 'Tajawal, sans-serif' }}>
      {/* Persistent Background Layer */}
      <div className="absolute inset-0 bg-[#F0FDF9]">
        <motion.div
          className="absolute w-[80vw] h-[80vw] rounded-full blur-[100px] opacity-40 mix-blend-multiply"
          style={{ background: '#16C47F' }}
          animate={{
            x: ['-20%', '30%', '10%', '-20%'],
            y: ['-10%', '-40%', '20%', '-10%'],
            scale: [1, 1.2, 0.8, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute right-0 bottom-0 w-[60vw] h-[60vw] rounded-full blur-[100px] opacity-30 mix-blend-multiply"
          style={{ background: '#0F9B62' }}
          animate={{
            x: ['20%', '-20%', '10%', '20%'],
            y: ['20%', '-10%', '-30%', '20%'],
            scale: [0.8, 1.2, 1, 0.8],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Persistent Geometric Accents */}
      <motion.div
        className="absolute w-64 h-64 border-[3px] border-[#16C47F]/20 rounded-full"
        animate={{
          x: ['70vw', '10vw', '80vw', '20vw', '50vw', '80vw', '70vw'][currentScene],
          y: ['-10vh', '50vh', '80vh', '20vh', '-20vh', '50vh', '-10vh'][currentScene],
          rotate: [0, 90, 180, 270, 360, 450, 540][currentScene],
          scale: [1, 1.5, 0.8, 2, 1, 1.3, 1][currentScene],
        }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="absolute right-[10%] bottom-[20%] w-[2px] h-32 bg-[#16C47F]/40 origin-bottom"
        animate={{
          rotate: [15, -25, 45, -15, 30, -45, 15][currentScene],
          scaleY: [1, 1.5, 0.8, 2, 1, 1.5, 1][currentScene],
          opacity: currentScene === 0 || currentScene === 6 ? 0.2 : 0.8
        }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* Persistent Steps Badge */}
      <motion.div
        className="absolute top-8 right-8 w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-[0_10px_40px_rgba(22,196,127,0.2)] z-50 border border-[#F0FDF9]"
        animate={{ 
          scale: [1, 1.15, 1], 
          opacity: currentScene === 0 || currentScene === 6 ? 0 : 1,
          y: currentScene === 0 || currentScene === 6 ? -20 : 0
        }}
        transition={{ duration: 0.5, ease: 'easeOut' }}>
        <motion.span className="text-3xl font-black text-[#16C47F] pt-2" key={currentScene}>
          {['', '١', '٢', '٣', '٤', '٥', ''][currentScene]}
        </motion.span>
      </motion.div>

      {/* Scenes */}
      <AnimatePresence mode="popLayout">
        {currentScene === 0 && <Scene0 key="scene0" />}
        {currentScene === 1 && <Scene1 key="scene1" />}
        {currentScene === 2 && <Scene2 key="scene2" />}
        {currentScene === 3 && <Scene3 key="scene3" />}
        {currentScene === 4 && <Scene4 key="scene4" />}
        {currentScene === 5 && <Scene5 key="scene5" />}
        {currentScene === 6 && <Scene6 key="scene6" />}
      </AnimatePresence>
    </div>
  );
}

export default TutorialVideo;

// ============================================================================
// SCENE COMPONENTS
// ============================================================================

const transitionSpring = { type: 'spring', stiffness: 400, damping: 28 };
const smoothSpring = { type: 'spring', stiffness: 120, damping: 22 };

function AnimatedText({ text, delayOffset = 0, className = "" }: { text: string, delayOffset?: number, className?: string }) {
  return (
    <span className={`inline-block ${className}`}>
      {text.split(' ').map((word, wordIndex) => (
        <span key={wordIndex} className="inline-block whitespace-nowrap mr-2">
          {word.split('').map((char, i) => (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ opacity: 0, y: 20, rotateX: 45 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25, delay: delayOffset + (wordIndex * 0.1) + (i * 0.02) }}
            >
              {char}
            </motion.span>
          ))}
        </span>
      ))}
    </span>
  );
}

// Scene 0 (Hero Intro)
function Scene0() {
  const [phase, setPhase] = useState(0);
  
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 4500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
      transition={{ duration: 0.8 }}
    >
      <div className="relative">
        {/* Logo Mark Reveal */}
        <motion.div 
          className="w-32 h-32 bg-white rounded-3xl shadow-2xl flex items-center justify-center relative overflow-hidden mb-8 mx-auto"
          initial={{ rotate: -90, scale: 0, borderRadius: '50%' }}
          animate={phase >= 1 ? { rotate: 0, scale: 1, borderRadius: '24px' } : { rotate: -90, scale: 0, borderRadius: '50%' }}
          transition={smoothSpring}
        >
          <motion.div 
            className="absolute inset-0 bg-gradient-to-tr from-[#16C47F] to-[#0F9B62]"
            initial={{ y: '100%' }}
            animate={phase >= 1 ? { y: 0 } : { y: '100%' }}
            transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={phase >= 1 ? { scale: 1 } : { scale: 0 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 400, damping: 20 }}
            className="relative z-10 text-white"
          >
            <Sparkles size={64} strokeWidth={1.5} />
          </motion.div>
        </motion.div>

        {/* Text Reveal */}
        <div className="text-center overflow-hidden">
          <motion.h1 
            className="text-8xl font-black text-[#1A2E24] mb-4"
            initial={{ y: '100%' }}
            animate={phase >= 1 ? { y: 0 } : { y: '100%' }}
            transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            نظافة
          </motion.h1>
        </div>
        
        <div className="h-12 overflow-hidden mt-4">
          {phase >= 2 && (
            <motion.p 
              className="text-2xl text-[#0F9B62] font-bold tracking-wide"
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={transitionSpring}
            >
              <AnimatedText text="خدمات تنظيف احترافية في متناول يدك" delayOffset={0} />
            </motion.p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Scene 1 (Step 1: اختر خدمتك)
function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300), // phone appears
      setTimeout(() => setPhase(2), 1000), // title appears
      setTimeout(() => setPhase(3), 1500), // cards start appearing
      setTimeout(() => setPhase(4), 7500), // exit start
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const services = [
    { icon: <Home size={32} />, title: "تنظيف المنازل", color: "bg-blue-50 text-blue-500" },
    { icon: <Briefcase size={32} />, title: "تنظيف المكاتب", color: "bg-purple-50 text-purple-500" },
    { icon: <Car size={32} />, title: "غسيل السيارات", color: "bg-orange-50 text-orange-500" }
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center gap-20 px-20 z-10"
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '-100%', opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex-1 flex flex-col justify-center">
        <h2 className="text-6xl font-black text-[#1A2E24] mb-6 leading-tight">
          <AnimatedText text="اختر خدمتك" delayOffset={0.5} />
        </h2>
        <motion.div 
          className="w-24 h-2 bg-[#16C47F] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: 96 }}
          transition={{ delay: 1, duration: 0.6 }}
        />
        <motion.p 
          className="text-2xl text-gray-500 mt-8 max-w-md leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.5 }}
        >
          مجموعة واسعة من خدمات التنظيف المصممة خصيصاً لتلبية احتياجاتك، بضغطة زر واحدة.
        </motion.p>
      </div>

      <div className="flex-1 flex justify-center items-center">
        {/* Phone Mockup */}
        <motion.div 
          className="w-[320px] h-[650px] bg-white rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.12)] border-[8px] border-white p-6 relative overflow-hidden flex flex-col"
          initial={{ y: '50vh', rotate: 10, opacity: 0 }}
          animate={phase >= 1 ? { y: 0, rotate: 0, opacity: 1 } : {}}
          transition={transitionSpring}
        >
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-100 rounded-b-2xl z-20"></div>
          
          <motion.div 
            className="text-xl font-bold text-gray-800 mt-8 mb-6 text-right"
            initial={{ opacity: 0, x: 20 }}
            animate={phase >= 2 ? { opacity: 1, x: 0 } : {}}
          >
            الخدمات المتاحة
          </motion.div>

          <div className="space-y-4 flex-1">
            {services.map((service, idx) => (
              <motion.div
                key={idx}
                className="bg-gray-50 rounded-2xl p-4 flex items-center gap-4 border border-gray-100 shadow-sm"
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={phase >= 3 ? { opacity: 1, x: 0, scale: 1 } : {}}
                transition={{ ...transitionSpring, delay: idx * 0.15 + (phase >= 3 ? 0 : 2) }}
                whileHover={{ scale: 1.02 }}
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${service.color}`}>
                  {service.icon}
                </div>
                <div className="font-bold text-lg text-gray-800">{service.title}</div>
                <div className="mr-auto w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#16C47F] shadow-sm">
                  <ArrowRight size={16} />
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Simulated Bottom Nav */}
          <div className="h-16 bg-gray-50 rounded-2xl mt-auto flex justify-between items-center px-6 text-gray-400">
            <div className="w-8 h-8 rounded-full bg-[#16C47F]/20 text-[#16C47F] flex items-center justify-center"><Home size={20} /></div>
            <div className="w-8 h-8 flex items-center justify-center"><Calendar size={20} /></div>
            <div className="w-8 h-8 flex items-center justify-center"><User size={20} /></div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Scene 2 (Step 2: اختر مزودًا)
function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const providers = [
    { name: "أحمد محمد", rating: "4.9", jobs: "120 طلب", color: "bg-blue-400" },
    { name: "شركة التألق", rating: "4.8", jobs: "540 طلب", color: "bg-purple-400" },
    { name: "فريق النظافة", rating: "4.7", jobs: "300 طلب", color: "bg-emerald-400" }
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-row-reverse items-center justify-center gap-20 px-20 z-10"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ y: '-100%', opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex-1 flex flex-col justify-center text-right">
        <h2 className="text-6xl font-black text-[#1A2E24] mb-6 leading-tight">
          <AnimatedText text="اختر مزودًا موثوقًا" delayOffset={0.5} />
        </h2>
        <motion.div 
          className="w-24 h-2 bg-[#16C47F] rounded-full ml-auto"
          initial={{ width: 0 }}
          animate={{ width: 96 }}
          transition={{ delay: 1, duration: 0.6 }}
        />
        <motion.p 
          className="text-2xl text-gray-500 mt-8 max-w-md ml-auto leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.5 }}
        >
          قارن بين أفضل مزودي الخدمة بناءً على التقييمات، والأسعار، وسجل الأعمال السابق.
        </motion.p>
      </div>

      <div className="flex-1 relative flex justify-center items-center">
        {/* Floating Cards */}
        <div className="relative w-full max-w-md h-[500px]">
          {providers.map((p, i) => (
            <motion.div
              key={i}
              className="absolute w-full bg-white rounded-3xl p-6 shadow-2xl border border-gray-50 flex items-center gap-6"
              initial={{ opacity: 0, y: 100, rotate: i % 2 === 0 ? 5 : -5, scale: 0.8 }}
              animate={phase >= 3 ? { 
                opacity: 1, 
                y: i * 110, 
                rotate: 0,
                scale: 1,
                zIndex: 3 - i
              } : {}}
              transition={{ ...transitionSpring, delay: i * 0.2 + (phase >= 3 ? 0 : 2) }}
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-inner ${p.color}`}>
                {p.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{p.name}</h3>
                <div className="flex items-center gap-4 text-sm font-medium">
                  <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-3 py-1 rounded-full">
                    <Star size={16} fill="currentColor" /> {p.rating}
                  </div>
                  <div className="text-gray-500 bg-gray-50 px-3 py-1 rounded-full">{p.jobs}</div>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-[#16C47F] flex items-center justify-center text-[#16C47F]">
                <CheckCircle size={24} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Scene 3 (Step 3: حدد موعدك وعنوانك)
function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 2500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center gap-16 px-20 z-10"
      initial={{ x: '-100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ scale: 1.2, opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex-1 flex flex-col justify-center">
        <h2 className="text-6xl font-black text-[#1A2E24] mb-6 leading-tight">
          <AnimatedText text="حدد موعدك وعنوانك" delayOffset={0.5} />
        </h2>
        <motion.div 
          className="w-24 h-2 bg-[#16C47F] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: 96 }}
          transition={{ delay: 1, duration: 0.6 }}
        />
        <motion.p 
          className="text-2xl text-gray-500 mt-8 max-w-md leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.5 }}
        >
          اختر الوقت الذي يناسبك، وحدد موقعك بدقة على الخريطة ليصلك الفريق في الموعد.
        </motion.p>
      </div>

      <div className="flex-1 flex flex-col gap-8 justify-center items-center">
        {/* Calendar Widget */}
        <motion.div 
          className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl border border-gray-100"
          initial={{ opacity: 0, y: 50, rotateX: -30 }}
          animate={phase >= 2 ? { opacity: 1, y: 0, rotateX: 0 } : {}}
          transition={transitionSpring}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">أغسطس 2024</h3>
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">&lt;</div>
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">&gt;</div>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-sm font-bold text-gray-400 mb-2">
            <div>أ</div><div>ث</div><div>أ</div><div>خ</div><div>ج</div><div>س</div><div>ح</div>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center font-semibold text-gray-800">
            {Array.from({ length: 14 }).map((_, i) => (
              <motion.div 
                key={i} 
                className={`aspect-square flex items-center justify-center rounded-full ${i === 10 ? 'bg-[#16C47F] text-white shadow-md' : 'bg-gray-50'}`}
                initial={i === 10 ? { scale: 0 } : {}}
                animate={i === 10 && phase >= 3 ? { scale: [0, 1.2, 1] } : {}}
                transition={{ duration: 0.5, delay: phase >= 3 ? 0.2 : 0 }}
              >
                {i + 1}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Map Widget */}
        <motion.div 
          className="w-full max-w-sm h-48 bg-gray-100 rounded-3xl overflow-hidden relative shadow-lg border border-white"
          initial={{ opacity: 0, y: 50 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
          transition={{ ...transitionSpring, delay: 0.2 }}
        >
          {/* Abstract Map Lines */}
          <svg width="100%" height="100%" className="absolute inset-0 opacity-20">
            <path d="M0,40 Q100,20 200,80 T400,60" fill="none" stroke="#000" strokeWidth="4" />
            <path d="M50,0 V200 M150,0 V200 M250,0 V200 M350,0 V200" fill="none" stroke="#000" strokeWidth="2" strokeDasharray="4 4" />
            <path d="M0,50 H400 M0,100 H400 M0,150 H400" fill="none" stroke="#000" strokeWidth="2" strokeDasharray="4 4" />
          </svg>
          
          {/* Location Pin */}
          <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            initial={{ y: -100, opacity: 0 }}
            animate={phase >= 4 ? { y: '-50%', opacity: 1 } : {}}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            <div className="w-12 h-12 bg-[#16C47F] rounded-full rounded-bl-none rotate-45 flex items-center justify-center shadow-lg border-2 border-white">
              <MapPin size={20} color="white" className="-rotate-45" />
            </div>
            <motion.div 
              className="w-4 h-1 bg-black/20 rounded-full mt-2"
              animate={phase >= 4 ? { scaleX: [0, 1.5, 1], opacity: [0, 1, 0.5] } : {}}
              transition={{ delay: 0.3, duration: 0.5 }}
            />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Scene 4 (Step 4: أكّد طلبك)
function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-row-reverse items-center justify-center gap-20 px-20 z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 0.8 }}
    >
      <div className="flex-1 flex flex-col justify-center text-right">
        <h2 className="text-6xl font-black text-[#1A2E24] mb-6 leading-tight">
          <AnimatedText text="أكّد طلبك ووافق على السعر" delayOffset={0.5} />
        </h2>
        <motion.div 
          className="w-24 h-2 bg-[#16C47F] rounded-full ml-auto"
          initial={{ width: 0 }}
          animate={{ width: 96 }}
          transition={{ delay: 1, duration: 0.6 }}
        />
        <motion.p 
          className="text-2xl text-gray-500 mt-8 max-w-md ml-auto leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.5 }}
        >
          أسعار واضحة وشفافة بدون رسوم خفية. راجع تفاصيل الفاتورة وأكّد الدفع بكل سهولة.
        </motion.p>
      </div>

      <div className="flex-1 flex justify-center items-center relative">
        {/* Receipt / Invoice */}
        <motion.div 
          className="w-full max-w-md bg-white rounded-t-xl rounded-b-3xl shadow-2xl relative overflow-hidden"
          initial={{ y: '100%', rotate: -5, opacity: 0 }}
          animate={phase >= 1 ? { y: 0, rotate: 0, opacity: 1 } : {}}
          transition={smoothSpring}
        >
          {/* Jagged top edge effect */}
          <div className="h-4 w-full bg-[radial-gradient(circle,transparent_4px,#fff_5px)] bg-[length:16px_16px] -top-2 absolute rotate-180"></div>
          
          <div className="p-8 pt-10">
            <div className="text-center mb-8 border-b-2 border-dashed border-gray-200 pb-8">
              <h3 className="text-3xl font-bold text-gray-800 mb-2">فاتورة الطلب</h3>
              <p className="text-gray-400 font-medium">رقم الطلب: #ORD-9824</p>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-600 font-medium">تنظيف شامل (فيلا)</span>
                <span className="font-bold">450 ر.س</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-600 font-medium">مواد تنظيف خاصة</span>
                <span className="font-bold">50 ر.س</span>
              </div>
              <div className="flex justify-between items-center text-lg text-[#16C47F]">
                <span className="font-medium">خصم العميل الجديد</span>
                <span className="font-bold">- 50 ر.س</span>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-6 flex justify-between items-center border border-gray-100">
              <span className="text-xl font-bold text-gray-600">الإجمالي</span>
              <motion.span 
                className="text-4xl font-black text-[#1A2E24]"
                initial={{ scale: 1 }}
                animate={phase >= 2 ? { scale: [1, 1.2, 1], color: '#16C47F' } : {}}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                450 ر.س
              </motion.span>
            </div>
          </div>
          
          {/* Confirmation Overlay */}
          <motion.div 
            className="absolute inset-0 bg-[#16C47F]/95 flex flex-col items-center justify-center text-white backdrop-blur-sm"
            initial={{ clipPath: 'circle(0% at 50% 100%)' }}
            animate={phase >= 3 ? { clipPath: 'circle(150% at 50% 50%)' } : {}}
            transition={{ duration: 0.8, ease: "circOut" }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={phase >= 3 ? { scale: [0, 1.2, 1] } : {}}
              transition={{ delay: 0.6, type: 'spring' }}
              className="bg-white text-[#16C47F] rounded-full p-4 mb-6 shadow-xl"
            >
              <CheckCircle size={64} strokeWidth={2.5} />
            </motion.div>
            <h3 className="text-4xl font-black mb-2">تم التأكيد</h3>
            <p className="text-xl font-medium opacity-90">جاري تعيين المزود...</p>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Scene 5 (Step 5: تتبع المزود)
function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center gap-16 px-20 z-10"
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex-1 flex flex-col justify-center">
        <h2 className="text-6xl font-black text-[#1A2E24] mb-6 leading-tight">
          <AnimatedText text="تتبّع المزود في الوقت الحقيقي" delayOffset={0.5} />
        </h2>
        <motion.div 
          className="w-24 h-2 bg-[#16C47F] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: 96 }}
          transition={{ delay: 1, duration: 0.6 }}
        />
        <motion.p 
          className="text-2xl text-gray-500 mt-8 max-w-md leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.5 }}
        >
          شاهد مسار وصول الفريق لمنزلك على الخريطة مباشرة، وابقَ على تواصل تام معهم.
        </motion.p>
      </div>

      <div className="flex-1 flex justify-center items-center">
        {/* Map Tracker Mockup */}
        <motion.div 
          className="w-[320px] h-[650px] bg-white rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.12)] border-[8px] border-white relative overflow-hidden flex flex-col"
          initial={{ rotateY: -90, opacity: 0, perspective: 1000 }}
          animate={phase >= 1 ? { rotateY: 0, opacity: 1 } : {}}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-100 rounded-b-2xl z-20"></div>
          
          {/* Map Area */}
          <div className="flex-1 bg-[#E8F5E9] relative overflow-hidden">
            {/* Grid Pattern */}
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:40px_40px]"></div>
            
            {/* Route Path */}
            <svg width="100%" height="100%" className="absolute inset-0">
              <motion.path 
                d="M 50,450 Q 100,400 150,400 T 250,250 T 150,150" 
                fill="none" 
                stroke="#16C47F" 
                strokeWidth="6" 
                strokeLinecap="round"
                strokeDasharray="10 10"
                initial={{ pathLength: 0 }}
                animate={phase >= 2 ? { pathLength: 1 } : {}}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
            </svg>
            
            {/* Destination Home */}
            <div className="absolute top-[120px] left-[120px] w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center text-blue-500 z-10 border-4 border-[#E8F5E9]">
              <Home size={24} />
            </div>
            
            {/* Moving Provider */}
            {phase >= 2 && (
              <motion.div 
                className="absolute w-16 h-16 bg-[#16C47F] rounded-full flex items-center justify-center text-white shadow-xl z-20 border-4 border-white"
                initial={{ x: 25, y: 425 }}
                animate={{ 
                  x: [25, 125, 225, 125], 
                  y: [425, 375, 225, 125] 
                }}
                transition={{ duration: 4, ease: "linear", times: [0, 0.3, 0.7, 1], repeat: Infinity, repeatDelay: 1 }}
              >
                <Truck size={28} />
                
                {/* Pulse effect */}
                <motion.div 
                  className="absolute inset-0 rounded-full border-2 border-[#16C47F]"
                  animate={{ scale: [1, 2], opacity: [1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </motion.div>
            )}
          </div>
          
          {/* Driver Info Card */}
          <motion.div 
            className="h-48 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)] p-6 relative z-30"
            initial={{ y: '100%' }}
            animate={phase >= 2 ? { y: 0 } : {}}
            transition={{ ...transitionSpring, delay: 0.5 }}
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 text-2xl font-bold">
                أ
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-bold text-gray-800">أحمد محمد</h4>
                <p className="text-gray-500 font-medium">سيصل خلال 15 دقيقة</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#16C47F]/10 flex items-center justify-center text-[#16C47F]">
                <Star fill="currentColor" size={20} />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Scene 6 (Outro)
function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#16C47F]"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: "easeInOut" }}
    >
      {/* Background Graphic Lines */}
      <svg width="100%" height="100%" className="absolute inset-0 opacity-10">
        <motion.circle 
          cx="50%" cy="50%" r="20%" 
          fill="none" stroke="white" strokeWidth="2" 
          initial={{ r: '0%' }}
          animate={{ r: '80%' }}
          transition={{ duration: 3, ease: "easeOut" }}
        />
        <motion.circle 
          cx="50%" cy="50%" r="40%" 
          fill="none" stroke="white" strokeWidth="2"
          initial={{ r: '0%' }}
          animate={{ r: '100%' }}
          transition={{ duration: 3, delay: 0.2, ease: "easeOut" }}
        />
      </svg>

      <div className="relative z-10 flex flex-col items-center">
        <motion.div 
          className="w-40 h-40 bg-white rounded-full shadow-2xl flex items-center justify-center mb-10 text-[#16C47F]"
          initial={{ scale: 0, rotate: 180 }}
          animate={phase >= 1 ? { scale: 1, rotate: 0 } : {}}
          transition={smoothSpring}
        >
          <Sparkles size={80} strokeWidth={1.5} />
        </motion.div>

        <div className="overflow-hidden">
          <motion.h2 
            className="text-8xl font-black text-white mb-6"
            initial={{ y: '100%' }}
            animate={phase >= 1 ? { y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            ابدأ الآن
          </motion.h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <div className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-10 py-5 rounded-full text-3xl font-bold flex items-center gap-4 cursor-pointer hover:bg-white/30 transition-colors">
            حمّل التطبيق مجانًا
            <ArrowRight size={28} />
          </div>
        </motion.div>

        <motion.p
          className="text-white/80 text-xl mt-8 font-medium"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : {}}
          transition={{ duration: 0.8 }}
        >
          متوفر على App Store و Google Play
        </motion.p>
      </div>
    </motion.div>
  );
}
