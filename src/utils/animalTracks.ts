import Phaser from 'phaser';

/**
 * Draw species-specific track shapes at the origin of a Graphics object.
 * Caller is responsible for positioning, rotation, depth, and alpha.
 */
export function drawTrackShape(g: Phaser.GameObjects.Graphics, species: string, s: number): void {
  g.fillStyle(0xb8c4d0, 1);
  switch (species) {
    case 'bunny':
      // Hare bounding: large hind paws AHEAD side-by-side,
      // smaller front paws BEHIND one-after-the-other
      g.fillEllipse(s * 1.2, -s, s * 1.2, s * 2);
      g.fillEllipse(s * 1.2, s, s * 1.2, s * 2);
      g.fillCircle(-s * 1.0, -s * 0.2, s * 0.5);
      g.fillCircle(-s * 1.8, s * 0.2, s * 0.5);
      break;
    case 'chamois':
    case 'bouquetin':
      // Elongated concave-edged cloven hooves
      g.fillEllipse(0, -s * 0.5, s * 1.6, s * 0.5);
      g.fillEllipse(0, s * 0.5, s * 1.6, s * 0.5);
      break;
    case 'marmot':
      g.fillCircle(0, -s * 0.3, s * 0.4);
      g.fillCircle(0, s * 0.3, s * 0.4);
      break;
    case 'fox':
      // Linear single-file paw print
      g.fillCircle(0, 0, s * 0.5);
      break;
    default:
      g.fillCircle(0, 0, s * 0.5);
      break;
  }
}
