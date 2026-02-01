export type LandCoordinates = {
  layer: number;
  tokenId: number;
  x: number;
  y: number;
};
export class SpiralGenerator {
  private totalLands: number = 0;
  private lastX: number; // Starting x-coordinate
  private lastY: number; // Starting y-coordinate
  private layer: number = 1; // Current layer (ring) of the spiral
  private step: number = 0; // Total steps taken in the current layer
  private sideLength: number = 1; // Length of the current side
  private direction: number = 0; // 0 = right, 1 = up, 2 = left, 3 = down

  private coordinates: Map<number, { x: number; y: number; layer: number }> =
    new Map();

  constructor(private readonly startFrom: number = 500) {
    this.lastX = startFrom;
    this.lastY = startFrom;
  }

  public mintLand(): LandCoordinates {
    const layer = this.layer;
    this.totalLands++;
    const tokenId = this.totalLands;

    if (tokenId === 1) {
      this.coordinates.set(tokenId, {
        x: this.lastX,
        y: this.lastY,
        layer,
      });
    } else {
      const { x, y } = this.getNextSpiralCoordinates();
      this.coordinates.set(tokenId, { x, y, layer });
      this.lastX = x;
      this.lastY = y;
    }
    this.updateSpiralState();

    // Debug output
    console.log(
      `Token ID: ${tokenId}, X: ${this.lastX}, Y: ${this.lastY}, Direction: ${this.direction}, SideLength: ${this.sideLength}`,
    );

    return {
      tokenId,
      x: this.coordinates.get(tokenId)!.x,
      y: this.coordinates.get(tokenId)!.y,
      layer,
    };
  }

  private getNextSpiralCoordinates(): { x: number; y: number } {
    let x = this.lastX;
    let y = this.lastY;
    if (this.step === 0) {
      y -= 1;
    }
    switch (this.direction) {
      case 0: // Right
        x += 1;
        break;
      case 1: // Up
        y += 1;
        break;
      case 2: // Left
        x -= 1;
        break;
      case 3: // Down
        y -= 1;
        break;
    }

    return { x, y };
  }

  private updateSpiralState(): void {
    this.step++;

    const maxStepsInLayer = this.layer === 1 ? 1 : (this.layer - 1) * 8;

    // Check if we've completed the current side
    if (this.isCorner() && this.step < maxStepsInLayer) {
      this.direction = (this.direction + 1) % 4; // Move to next direction
      // Increase sideLength only after completing a full "turn" (e.g., after "right" or "up")
      // if (this.direction === 0 || this.direction === 2) {
      //   this.sideLength++; // Increase side length at the start of a new rightward move
      // }
    }

    if (this.step === maxStepsInLayer) {
      this.layer++;
      this.step = 0;
      this.sideLength = 2 * (this.layer - 1) + 1; // Reset for new layer
      this.direction = 0; // Start new layer moving right
    }
  }

  public getCoordinates(tokenId: number): { x: number; y: number } | undefined {
    return this.coordinates.get(tokenId);
  }

  private isCorner(): boolean {
    if (
      this.lastX === this.startFrom + this.layer - 1 ||
      this.lastX === this.startFrom - this.layer + 1
    ) {
      if (
        this.lastY === this.startFrom + this.layer - 1 ||
        this.lastY === this.startFrom - this.layer + 1
      ) {
        return true;
      }
    }
    return false;
  }
  public generateBatch(amount: number): LandCoordinates[] {
    const results: LandCoordinates[] = [];
    for (let i = 0; i < amount; i++) {
      results.push(this.mintLand());
    }
    return results;
  }
}
