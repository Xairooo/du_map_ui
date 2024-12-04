import { EventEmitter, Injectable } from '@angular/core';
import { Settings } from '../model/Settings';
import { OreSettings } from '../model/OreValues';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  public settingsChanged = new EventEmitter<Settings>();
  public oreSettingsChange = new EventEmitter<OreSettings[]>();
  private settings: Settings;
  public oreSettings: OreSettings[];

  constructor() {
    const storedSettings = localStorage.getItem('dumap_settings');
    this.settings = new Settings(
      storedSettings ? JSON.parse(storedSettings) : {}
    );

    const storedOreValues = localStorage.getItem('dumap_orevalues');
    if (storedOreValues) {
      this.oreSettings = JSON.parse(storedOreValues).map(
        (ore: any) =>
          new OreSettings(
            ore.name,
            ore.tier,
            ore.hc,
            ore.quanta,
            ore.color,
            ore.order,
            ore.itemId,
            ore.pictureName
          )
      );
    } else {
      this.oreSettings = [
        {
          name: 'Bauxite',
          tier: 1,
          hc: 10,
          quanta: 90,
          color: 'rgb(214, 255, 255)',
          order: 10,
          itemId: 262147665,
        },
        {
          name: 'Coal',
          tier: 1,
          hc: 10,
          quanta: 90,
          color: 'rgb(214, 255, 255)',
          order: 7,
          itemId: 299255727,
        },
        {
          name: 'Hematite',
          tier: 1,
          hc: 10,
          quanta: 90,
          color: 'rgb(0, 186, 255)',
          order: 8,
          itemId: 4234772167,
        },
        {
          name: 'Quartz',
          tier: 1,
          hc: 10,
          quanta: 90,
          color: 'rgb(104, 238, 255)',
          order: 9,
          itemId: 3724036288,
        },

        {
          name: 'Chromite',
          tier: 2,
          hc: 20,
          quanta: 390,
          color: 'rgb(0, 164, 244)',
          order: 6,
          itemId: 2029139010,
        },
        {
          name: 'Limestone',
          tier: 2,
          hc: 20,
          quanta: 390,
          color: 'rgb(101, 232, 249)',
          order: 100,
          itemId: 3086347393,
        },
        {
          name: 'Malachite',
          tier: 2,
          hc: 20,
          quanta: 390,
          color: 'rgb(10, 173, 255)',
          order: 3,
          itemId: 2289641763,
        },
        {
          name: 'Natron',
          tier: 2,
          hc: 20,
          quanta: 390,
          color: 'rgb(191, 249, 250)',
          order: 102,
          itemId: 343766315,
        },

        {
          name: 'Acanthite',
          tier: 3,
          hc: 50,
          quanta: 900,
          color: 'rgb(0, 220, 116)',
          order: 4,
          itemId: 1050500112,
        },
        {
          name: 'Garnierite',
          tier: 3,
          hc: 50,
          quanta: 900,
          color: 'rgb(104, 238, 255)',
          order: 104,
          itemId: 1065079614,
        },
        {
          name: 'Petalite',
          tier: 3,
          hc: 50,
          quanta: 900,
          color: 'rgb(150, 246, 255)',
          order: 11,
          itemId: 3837858336,
        },
        {
          name: 'Pyrite',
          tier: 3,
          hc: 50,
          quanta: 900,
          color: 'rgb(0, 186, 255)',
          order: 5,
          itemId: 4041459743,
        },

        {
          name: 'Cobaltite',
          tier: 4,
          hc: 200,
          quanta: 2500,
          color: 'rgb(0, 201, 255)',
          order: 1,
          itemId: 3546085401,
        },
        {
          name: 'Cryolite',
          tier: 4,
          hc: 200,
          quanta: 2500,
          color: 'rgb(64, 224, 255)',
          order: 107,
          itemId: 1467310917,
        },
        {
          name: 'Gold nuggets',
          pictureName: 'Gold',
          tier: 4,
          hc: 200,
          quanta: 2500,
          color: 'rgb(255, 91, 0)',
          order: 108,
          itemId: 1866812055,
        },
        {
          name: 'Kolbeckite',
          tier: 4,
          hc: 200,
          quanta: 2500,
          color: 'rgb(150, 246, 255)',
          order: 2,
          itemId: 271971371,
        },

        {
          name: 'Columbite',
          tier: 5,
          hc: 250,
          quanta: 3000,
          color: 'rgb(0, 200, 255)',
          order: 109,
          itemId: 789110817,
        },
        {
          name: 'Ilmenite',
          tier: 5,
          hc: 250,
          quanta: 3000,
          color: 'rgb(0, 164, 244)',
          order: 110,
          itemId: 629636034,
        },
        {
          name: 'Rhodonite',
          tier: 5,
          hc: 250,
          quanta: 3000,
          color: 'rgb(11, 172, 252)',
          order: 111,
          itemId: 3934774987,
        },
        //{name: 'Thoramine',  tier: 5, order: 112, itemId: 0},
        {
          name: 'Vanadinite',
          tier: 5,
          hc: 250,
          quanta: 3000,
          color: 'rgb(0, 220, 116)',
          order: 113,
          itemId: 2162350405,
        },
        // Add other default ore settings here
      ];
      localStorage.setItem('dumap_orevalues', JSON.stringify(this.oreSettings));
    }
  }

  public getSettings(): Settings {
    return this.settings;
  }

  public setSettingsValue(key: string, value: boolean | number) {
    this.settings[key] = value;
    this.settingsChanged.emit(this.settings);
    localStorage.setItem('dumap_settings', JSON.stringify(this.settings));
  }

  public getSettingsValue(key: string): boolean | number {
    return this.settings[key];
  }

  public OreSettings(): OreSettings[] {
    return this.oreSettings;
  }
  public setOreQuanta(index: number, newQuanta: number) {
    const oreSettings = [...this.oreSettings];
    oreSettings[index].quanta = newQuanta;
    this.oreSettingsChange.emit(oreSettings);
    localStorage.setItem('dumap_orevalues', JSON.stringify(oreSettings));
  }

  public getOreSetting(key: string): boolean | number {
    return this.oreSettings[key];
  }
}
