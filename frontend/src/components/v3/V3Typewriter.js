import React, { useState, useEffect, useRef } from 'react';

const V3Typewriter = ({ sections, onComplete, speed = 12 }) => {
  const [visibleSections, setVisibleSections] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const containerRef = useRef(null);

  const flatContent = sections.map(s => {
    if (s.type === 'heading') return { type: 'heading', text: s.text, len: s.text.length };
    if (s.type === 'prose') return { type: 'prose', text: s.text, len: s.text.length };
    if (s.type === 'bullet') return { type: 'bullet', text: s.text, len: s.text.length };
    return { type: 'text', text: s.text || '', len: (s.text || '').length };
  });

  useEffect(() => {
    if (!isTyping || visibleSections >= flatContent.length) {
      if (visibleSections >= flatContent.length) onComplete?.();
      return;
    }
    const current = flatContent[visibleSections];
    if (charIndex >= current.len) {
      const timer = setTimeout(() => {
        setVisibleSections(v => v + 1);
        setCharIndex(0);
      }, current.type === 'heading' ? 400 : 80);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setCharIndex(c => c + Math.floor(Math.random() * 3) + 1), speed);
    return () => clearTimeout(timer);
  }, [visibleSections, charIndex, isTyping]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [visibleSections, charIndex]);

  const skipToEnd = () => {
    setIsTyping(false);
    setVisibleSections(flatContent.length);
    onComplete?.();
  };

  return (
    <div ref={containerRef} className="relative">
      {flatContent.map((section, i) => {
        if (i > visibleSections) return null;
        const text = i === visibleSections ? section.text.substring(0, charIndex) : section.text;
        const showCursor = i === visibleSections && isTyping && visibleSections < flatContent.length;

        if (section.type === 'heading') {
          return <h2 key={i} className="relative">{text}{showCursor && <span className="inline-block w-0.5 h-5 bg-[#1F4A3A] ml-0.5 animate-pulse" />}</h2>;
        }
        if (section.type === 'bullet') {
          return <li key={i} className="relative">{text}{showCursor && <span className="inline-block w-0.5 h-4 bg-[#1F4A3A] ml-0.5 animate-pulse" />}</li>;
        }
        return <p key={i} className="relative">{text}{showCursor && <span className="inline-block w-0.5 h-4 bg-[#1F4A3A] ml-0.5 animate-pulse" />}</p>;
      })}
      {isTyping && visibleSections < flatContent.length && (
        <button onClick={skipToEnd} className="mt-4 text-[10px] text-[#8A8A8A] hover:text-[#5C5C5C] transition-colors" data-testid="skip-animation">
          Skip animation
        </button>
      )}
    </div>
  );
};

export default V3Typewriter;
