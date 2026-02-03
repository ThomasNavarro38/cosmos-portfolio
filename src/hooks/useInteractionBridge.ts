import { useStore } from '../engine/store';

/**
 * Hook to synchronize interaction states (hover/click) between DOM and Canvas layers.
 */
export const useInteractionBridge = () => {
  const setHoveredId = useStore((state) => state.setHoveredId);
  const setActiveId = useStore((state) => state.setActiveId);
  const generateProxyId = useStore((state) => state.generateProxyId);

  const handlePointerEnter = (id: string) => {
    setHoveredId(id);
  };

  const handlePointerEnterByName = (name: string) => {
    setHoveredId(generateProxyId(name));
  };

  const handlePointerLeave = () => {
    setHoveredId(null);
  };

  const handleClick = (id: string) => {
    setActiveId(id);
  };

  const handleClickByName = (name: string) => {
    setActiveId(generateProxyId(name));
  };

  return {
    handlePointerEnter,
    handlePointerEnterByName,
    handlePointerLeave,
    handleClick,
    handleClickByName,
  };
};
