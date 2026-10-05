import { useEffect, useRef } from 'react';

/**
 * Close an inline popup when the pointer goes down anywhere outside it.
 *
 * The admin pages are full of buttons that drop a small panel of options
 * beside themselves - "Send to Brand", "Send to Creator", the share and
 * download menus. Unlike a full-screen modal there is no backdrop to click,
 * so without this the only way to dismiss one was to press its button again,
 * and an admin who clicked elsewhere was left with the panel covering the
 * page. Every one of those menus now shares this hook.
 *
 * Usage:
 *   const menuRef = useClickOutside(open, () => setOpen(false));
 *   <div className="relative" ref={menuRef}> button + panel </div>
 *
 * The ref goes on the wrapper that contains BOTH the toggle button and the
 * panel, so pressing the button still toggles rather than closing and
 * immediately reopening.
 *
 * When the component owns only the panel and not the button - ShareMenu is
 * rendered as a sibling of its button inside the caller's `relative` wrapper
 * - pass `getBoundary` to widen what counts as inside:
 *
 *   useClickOutside(open, onClose, (panel) => panel.parentElement)
 *
 * Without that the toggle button counts as outside: mousedown closes the
 * menu, the button's own onClick reopens it, and the button looks broken.
 *
 * `mousedown` (not `click`) so the panel is gone before a click lands on
 * whatever is underneath, which is what makes clicking straight onto another
 * control feel right rather than needing two clicks. `touchstart` covers
 * tablets, where the admin pages are also used.
 */
export const useClickOutside = (open, onClose, getBoundary) => {
  const ref = useRef(null);
  // Held in refs so inline arrows - `() => setOpen(false)`, and the boundary
  // resolver - do not re-subscribe the listener on every render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const getBoundaryRef = useRef(getBoundary);
  getBoundaryRef.current = getBoundary;

  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => {
      const node = ref.current;
      if (!node) return;
      const boundary = getBoundaryRef.current ? getBoundaryRef.current(node) : node;
      if (boundary && !boundary.contains(event.target)) {
        onCloseRef.current?.();
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  return ref;
};

export default useClickOutside;
