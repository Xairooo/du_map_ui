
  export class OreSettings {
    constructor(
      public name: string,
      public tier: number,
      public hc: unknown,
      public quanta: number,
      public color: string,
      public order: number,
      public itemId: number,
      public pictureName?: string,
    ) {}
  }
