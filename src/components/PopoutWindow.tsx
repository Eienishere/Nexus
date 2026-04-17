import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type PopoutFeatures = {
  width?: number;
  height?: number;
  left?: number;
  top?: number;
  resizable?: boolean;
};

function copyStyles(sourceDoc: Document, targetDoc: Document) {
  // Copy <link rel="stylesheet"> and <style> so Tailwind / app CSS works.
  const head = targetDoc.head;
  [...sourceDoc.querySelectorAll('link[rel="stylesheet"], style')].forEach((node) => {
    head.appendChild(node.cloneNode(true));
  });
}

function featuresToString(f: PopoutFeatures) {
  const parts: string[] = [];
  if (f.width) parts.push(`width=${f.width}`);
  if (f.height) parts.push(`height=${f.height}`);
  if (typeof f.left === 'number') parts.push(`left=${f.left}`);
  if (typeof f.top === 'number') parts.push(`top=${f.top}`);
  parts.push(`resizable=${f.resizable === false ? 'no' : 'yes'}`);
  return parts.join(',');
}

export default function PopoutWindow({
  title,
  isOpen,
  targetWindow,
  onClose,
  features,
  children,
}: {
  title: string;
  isOpen: boolean;
  targetWindow?: Window | null;
  onClose: () => void;
  features?: PopoutFeatures;
  children: React.ReactNode;
}) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const winRef = useRef<Window | null>(null);
  const isOpenRef = useRef(isOpen);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const featureStr = useMemo(
    () =>
      featuresToString({
        width: 320,
        height: 180,
        ...features,
      }),
    [features]
  );

  useEffect(() => {
    if (winRef.current && !winRef.current.closed) {
      winRef.current.document.title = title;
    }
  }, [title]);

  useEffect(() => {
    if (!isOpen) return;

    const existing = targetWindow ?? winRef.current;
    const w = existing && !existing.closed ? existing : window.open('', title, featureStr);
    if (!w) return onCloseRef.current();

    winRef.current = w;
    w.document.title = title;

    const root = w.document.createElement('div');
    root.id = 'nexus-popout-root';
    w.document.body.innerHTML = '';
    w.document.body.style.margin = '0';
    w.document.body.style.background = 'transparent';
    w.document.body.appendChild(root);

    // Keep theme consistent (app uses data-theme on <html>).
    const theme = document.documentElement.getAttribute('data-theme');
    if (theme) w.document.documentElement.setAttribute('data-theme', theme);
    copyStyles(document, w.document);

    // Close tracking.
    const timer = window.setInterval(() => {
      if (w.closed) onCloseRef.current();
    }, 400);

    // Also react to theme changes.
    const handleThemeChange = (e: Event) => {
      const newTheme = (e as CustomEvent).detail;
      if (newTheme) w.document.documentElement.setAttribute('data-theme', newTheme);
    };
    window.addEventListener('theme-change', handleThemeChange);

    setContainer(root);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('theme-change', handleThemeChange);
      try {
        // Only close the external window when we truly want to close the popout.
        // When `title` changes, effect cleanup may run; don't close the window in that case.
        if (!isOpenRef.current) w.close();
      } catch {
        // ignore
      }
      winRef.current = null;
      setContainer(null);
    };
  }, [featureStr, isOpen, targetWindow, title]);

  if (!isOpen || !container) return null;

  return createPortal(children, container);
}

