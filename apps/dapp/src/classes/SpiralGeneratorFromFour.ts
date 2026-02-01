export type LandCoordinates = {
  layer: number;
  tokenId: number;
  x: number;
  y: number;
};
export class SpiralGeneratorFromFour {
  private totalLands: number = 0;
  private lastX: number; // Starting x-coordinate
  private lastY: number; // Starting y-coordinate
  private layer: number = 1; // Current layer (ring) of the spiral
  private step: number = 0; // Total steps taken in the current layer
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
    // const { x, y } = this.getNextSpiralCoordinates();
    // this.coordinates.set(tokenId, { x, y, layer });
    // this.lastX = x;
    // this.lastY = y;

    this.updateSpiralState();

    // Debug output
    console.log(
      `Token ID: ${tokenId}, X: ${this.lastX}, Y: ${this.lastY}, Direction: ${this.direction}`,
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

    const maxStepsInLayer = (this.layer * 2 - 1) * 4;

    // 1- 1 * 4 = 4
    // 2 - 3 * 4 = 12 (n*2 -1) * 4
    // 3 - 5 * 4 = 20
    // 4 - 7 * 4 = 28
    // Check if we've completed the current side
    if (this.isCorner() && this.step < maxStepsInLayer) {
      this.direction = (this.direction + 1) % 4; // Move to next direction
    }

    if (this.step === maxStepsInLayer) {
      this.layer++;
      this.step = 0;
      this.direction = 0; // Start new layer moving right
    }
  }

  public getCoordinates(tokenId: number): { x: number; y: number } | undefined {
    return this.coordinates.get(tokenId);
  }

  private isCorner(): boolean {
    if (
      this.lastX === this.startFrom + this.layer - 1 ||
      this.lastX === this.startFrom - this.layer
    ) {
      if (
        this.lastY === this.startFrom + this.layer ||
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
