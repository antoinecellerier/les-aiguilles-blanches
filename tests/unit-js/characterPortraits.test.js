import { describe, it, expect, vi } from 'vitest';
import { drawPortrait } from '../../src/utils/characterPortraits';

// Mock Phaser Graphics
const createMockGraphics = () => ({
  fillStyle: vi.fn(),
  fillRect: vi.fn(),
});

describe('Character Portraits', () => {
  it('should draw Jean-Pierre without crashing', () => {
    const g = createMockGraphics();
    drawPortrait(g, 'Jean-Pierre', 100, 100, 40);
    expect(g.fillRect).toHaveBeenCalled();
  });

  it('should draw Marie without crashing', () => {
    const g = createMockGraphics();
    drawPortrait(g, 'Marie', 100, 100, 40);
    expect(g.fillRect).toHaveBeenCalled();
  });
  
  it('should draw Thierry without crashing', () => {
    const g = createMockGraphics();
    drawPortrait(g, 'Thierry', 100, 100, 40);
    expect(g.fillRect).toHaveBeenCalled();
  });
  
  it('should draw Emilie without crashing', () => {
    const g = createMockGraphics();
    drawPortrait(g, 'Émilie', 100, 100, 40);
    expect(g.fillRect).toHaveBeenCalled();
  });
  
  it('should draw Generic for unknown', () => {
    const g = createMockGraphics();
    drawPortrait(g, 'Unknown', 100, 100, 40);
    expect(g.fillRect).toHaveBeenCalled();
  });
});
