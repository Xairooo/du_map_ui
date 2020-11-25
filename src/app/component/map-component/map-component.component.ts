import { Component, ElementRef,  HostListener, Inject, OnInit, ViewChild } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { Subject } from 'rxjs';
import { Face } from 'src/app/model/Face';
import { Scan } from 'src/app/model/Scan';
import { SelectedTile } from 'src/app/model/SelectedTile';
import { Settings } from 'src/app/model/Settings';
import { MapService } from 'src/app/service/map.service';
import { RequestService } from 'src/app/service/request.service';
import { SettingsService } from 'src/app/service/settings.service';

@Component({
  selector: 'dumap-map-component',
  templateUrl: './map-component.component.html',
  styleUrls: ['./map-component.component.scss']
})
export class MapComponentComponent implements OnInit {

  @ViewChild('canvas', { static: true })
  canvas: ElementRef<HTMLCanvasElement>;

  private ctx: CanvasRenderingContext2D;

  selectedTile = new SelectedTile(0, 31);
  perspectiveScale = 6000;

  public CANVAS_WIDTH  = 900;
  public CANVAS_HEIGHT = 800;
  public offsetX2D = this.CANVAS_WIDTH / 2;
  public offsetY2D = this.CANVAS_HEIGHT / 2;

  public canvasTolerance = 50;
  public face: Face[];

  scrollOffset = 0;

  oreIcons = {};
  oreIconsLoaded = {};
  private imagesLoadedSubject: Subject<any>;

  private settings: Settings;

  @HostListener('window:scroll', ['$event'])
  doSomething(event) {
    // console.debug("Scroll Event", document.body.scrollTop);
    // see András Szepesházi's comment below
    this.scrollOffset = window.pageYOffset;
  }

  constructor(
    private requestService: RequestService,
    private mapService: MapService,
    private oauthService: OAuthService,
    private settingsService: SettingsService,
    @Inject('ORES') private oreNames,
    @Inject('PLANETS') private planetNames
  ) {
    this.mapService.tileSelected.subscribe(selectedTile => {
      this.selectedTile = selectedTile;
      this.loadMap(selectedTile.celestialId, selectedTile.tileId);
    });
    // loads map after user loged in else clears the map
    mapService.loginChange.subscribe(logedIn => {
      if (logedIn) {
        this.loadMap(this.selectedTile.celestialId, this.selectedTile.tileId);
      } else {
        this.clear();
      }
    });
    settingsService.settingsChanged.subscribe(
      settings => {
        this.settings = settings;
        this.drawMap();
      }
    );
    // if a scan was added, add it to the tile without reload and repaint the map
    mapService.scanAdded.subscribe( (scan: Scan) => {
      const planet = this.planetNames.find(p => p.name === scan.planet);
      console.log('scan added at ', planet, this.selectedTile.celestialId);
      if (+planet.id === +this.selectedTile.celestialId) {
        const scannedTile = this.face.find(f => +f.tileId === +scan.tileId);
        console.log('searching for tile', scan.tileId, scannedTile);
        if (scannedTile) {
          scannedTile.scan = scan;
          console.log(scannedTile.scan);
          this.drawMap();
        }
      }
    });

    this.imagesLoadedSubject = new Subject<any>();
    // loads the map initialy when icons are loaded
    this.imagesLoadedSubject.subscribe( () => this.loadMap(this.selectedTile.celestialId, this.selectedTile.tileId) );
    this.settings = settingsService.getSettings();
    this.getOreIcon('Bauxite');
  }


  ngOnInit() {
    this.ctx = this.canvas.nativeElement.getContext('2d');
  }

  loadMap(celestialId, tileId) {
    if (!this.oauthService.getIdentityClaims()) {
      return;
    }
    this.requestService.requestMap(celestialId, tileId).then(
      result => {
        this.face = result;
        this.drawMap();
        // this.markCenter();
      },
      error => {
        if (error.status === 404) {
          this.mapService.loading.next(false);
          const planetName = this.planetNames.find(p => p.id == celestialId).name;
          alert(`Tile ${tileId} does not exist on ${planetName}`);
        }
      }
    );
  }

  private drawMap() {
    this.clear();
    for (const f of this.face) {
      this.drawFace(f);
    }
    for (const f of this.face) {
      this.drawText(f);
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
  }

  markCenter() {
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.CANVAS_HEIGHT / 2);
    this.ctx.lineTo(this.CANVAS_WIDTH, this.CANVAS_HEIGHT / 2);
    this.ctx.moveTo(this.CANVAS_WIDTH / 2, 0);
    this.ctx.lineTo(this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT);
    this.ctx.strokeStyle = 'rgba(0,0,0,1)';
    this.ctx.stroke();
  }

  getOreIcon(oreName: string){
    if (!this.oreIcons[oreName]) {
      this.oreIconsLoaded[oreName] = false;
      const img = new Image();
      img.width = 30;
      img.height = 30;
      img.onload = () => { console.log('image loaded'); this.setImageLoaded(oreName); };
      img.src = `/assets/${oreName}.png`;
      this.oreIcons[oreName] = img;
    }

    return this.oreIcons[oreName];
  }
  setImageLoaded(oreName) {
    this.oreIconsLoaded[oreName] = true;
    if (this.getAllIconsLoaded()) {
      this.imagesLoadedSubject.next(true);
    }
  }

  getAllIconsLoaded() {
    let loaded = true;
    for (const loadedImg of Object.keys(this.oreIconsLoaded)) {
      loaded = loaded && this.oreIconsLoaded[loadedImg];
    }
    return loaded;
  }

  drawText(face) {
    const vertex = face.vertices;
    const center = face.center;
    // console.log('face vertices', face, vertex , center);
    let x;
    let y;
    let z;
    if (center[0] < -(this.CANVAS_WIDTH / 2) - this.canvasTolerance || center [0] > this.CANVAS_WIDTH / 2 + this.canvasTolerance) {
    //  console.log('skip width', face);
      return;
    }
    if (center[1] < -(this.CANVAS_HEIGHT / 2) - this.canvasTolerance || center [1] > this.CANVAS_HEIGHT / 2 + this.canvasTolerance) {
    //  console.log('skip height', face);
      return;
    }
    this.ctx.beginPath();
    let minY = Infinity;
    let maxY = -Infinity;
    let minX = Infinity;
    let maxX = -Infinity;
    [x, y] = vertex[vertex.length - 1];
    this.ctx.moveTo(x + this.offsetX2D, y + this.offsetY2D);
    for (const v of vertex) {
      [x, y, z] = v;
      minX = x < minX ? x : minX;
      maxX = x > maxX ? x : maxX;
      minY = y < minY ? y : minY;
      maxY = y > maxY ? y : maxY;
      this.ctx.lineTo(x + this.offsetX2D, y + this.offsetY2D);
    }
    const centerToTop = minY - center[1];
    const yModifier = Math.abs(centerToTop) < 45 ? 0 : 15;
    console.log(yModifier);
    if ( face.scan) {
      [x, y] = center;
      let yOreOffset = 0;
      let xOreOffset = 0;
      if (this.settings.showResourceIcons) {
        let lastOre;
        for (const ore of this.oreNames) {
          if (face.scan.ores[ore.name]) {
            if (this.settings.showOreIconsT(ore.tier)) {
              if (lastOre && ore.tier !== lastOre.tier) {
                yOreOffset += 20;
                xOreOffset = 0;
              }
              console.log('draw image', this.getAllIconsLoaded());
              this.ctx.drawImage(this.getOreIcon(ore.pictureName ? ore.pictureName : ore.name),
                0, 0, 82, 82,
                x + this.offsetX2D - 40 + xOreOffset, y + this.offsetY2D  - yModifier + yOreOffset, 22, 22
              );
              xOreOffset += 18;
              lastOre = ore;
            }
          }
        }
        yOreOffset += 20;
      }

      xOreOffset = 0;
      if (this.settings.showResourceAmount) {
        const fontSize = 13;
        this.ctx.font = fontSize + 'px Arial';
        this.ctx.fillStyle = `rgba(0, 0, 0, ${1.0})`;
        for (const ore of this.oreNames) {
          if (face.scan.ores[ore.name]) {
            if (this.settings.showOreTextsT(ore.tier)) {
              const oreShort = ore.name.substring(0, 3);
              const amount = Math.round(face.scan.ores[ore.name] / 1000);
              const text = `${amount}kL`; // ${oreShort}
              const metrics = this.ctx.measureText(text);
              this.ctx.fillStyle = ore.color || `rgba(0, 0, 0, ${1.0})`;
              this.ctx.fillText(text + ` ${oreShort}`, x + this.offsetX2D +5-metrics.width + xOreOffset, y + this.offsetY2D  -yModifier + fontSize*1.2 + yOreOffset);
              yOreOffset += fontSize;
            }
          }
        }
      }
    }

    if ('' + face.tileId) {
      [x, y] = center;
      console.log(face.tileId, y, minY, minY - y, yModifier);

      const fontSize = 24; // Math.round(26 / 6000 * this.perspectiveScale);
      this.ctx.font = fontSize + 'px Arial';
      this.ctx.fillStyle = `rgba(0, 0, 0, ${1.0})`;
      const text = '' + face.tileId;
      const metrics = this.ctx.measureText(text);
      // + fontSize / 2
      this.ctx.fillText(text, x + this.offsetX2D - metrics.width / 2, y -  (face.scan && this.settings.showResourceAmount ? yModifier : 0) + this.offsetY2D);
    }
  }
  drawFace(face, color = `rgb(64,77,85)`) {
    const vertex = face.vertices;
    const center = face.center;
    // console.log('face vertices', face, vertex , center);
    let x;
    let y;
    let z;
    if (center[0] < -(this.CANVAS_WIDTH / 2) - this.canvasTolerance || center [0] > this.CANVAS_WIDTH / 2 + this.canvasTolerance) {
    //  console.log('skip width', face);
      return;
    }
    if (center[1] < -(this.CANVAS_HEIGHT / 2) - this.canvasTolerance || center [1] > this.CANVAS_HEIGHT / 2 + this.canvasTolerance) {
    //  console.log('skip height', face);
      return;
    }
    this.ctx.beginPath();

    let minY = Infinity;
    let maxY = -Infinity;
    let minX = Infinity;
    let maxX = -Infinity;
    [x, y] = vertex[vertex.length - 1];
    this.ctx.moveTo(x + this.offsetX2D, y + this.offsetY2D);
    for (const v of vertex) {
      [x, y, z] = v;
      minX = x < minX ? x : minX;
      maxX = x > maxX ? x : maxX;
      minY = y < minY ? y : minY;
      maxY = y > maxY ? y : maxY;
      this.ctx.lineTo(x + this.offsetX2D, y + this.offsetY2D);
    }
    const centerToTop = minY - y;

    if (face.owner) {
      this.ctx.fillStyle = `rgba(160, 0, 0, 1.0)`;
    } else {
      this.ctx.fillStyle = color;
    }
    this.ctx.fill();

    if (face.scan &&  Object.keys(face.scan.ores).length === 0) {
      this.ctx.fillStyle = `rgba(0, 0, 0, 0.5)`;
      this.ctx.fill();
    } else if (face.scan) {
      // console.log(face.tileId, face, Object.keys(face.scan.ores).length);
      this.ctx.fillStyle = `rgba(50, 50, 50, 1.0)`;
      this.ctx.fill();
    }

    this.ctx.strokeStyle = 'lightgrey'; // rgba(0,0,0,0.3)';  // light lines, less cartoony, more render-y
    this.ctx.stroke();
    // console.log(face, face.tileId, face.tileId, center[0], center[1]);
  }

  public onCanvasClick(event) {
    if (!this.face) { return; }
    event.preventDefault();
    // relative mouse coords
    const mouseX = event.clientX - this.offsetX2D - this.canvas.nativeElement.getBoundingClientRect().left;
    const mouseY = event.clientY - this.offsetY2D - this.scrollOffset - this.canvas.nativeElement.getBoundingClientRect().top;
    // console.log(mouseX, mouseY);
    for (const f of this.face) {
      if (this.isInside(f.vertices, [mouseX, mouseY])) {
        // console.log('clicked in tile ' + f.tileId);
        this.mapService.faceSelected.emit(f);
        break;
      }
    }
  }

  public onCanvasRightClick(event) {
    if (!this.face) { return; }
    event.preventDefault();
    // relative mouse coords
    const mouseX = event.clientX - this.offsetX2D - this.canvas.nativeElement.getBoundingClientRect().left;
    const mouseY = event.clientY - this.offsetY2D - this.scrollOffset - this.canvas.nativeElement.getBoundingClientRect().top;
    // console.log(mouseX, mouseY);
    for (const f of this.face) {
      if (this.isInside(f.vertices, [mouseX, mouseY])) {
        console.log('right clicked in tile ' + f.tileId);
        // this.mapService.faceSelected.emit(f);
        break;
      }
    }
  }

  isInside(vertices, point) {
    const extreme = [10000, point[1]];
    let count = 0;
    let i = 0;
    do {
      const next = (i + 1) % vertices.length;
      if (this.doIntersect(vertices[i], vertices[next], point, extreme)) {
        if(this.orientation(vertices[i], point, vertices[next]) === 0) {
          return this.onSegment(vertices[i],point,vertices[next]);
        }
        count++;
      }
      i = next;
    } while (i !== 0);
    return (count % 2 === 1);
  }
  doIntersect(p1, q1, p2, q2) {
    const o1 = this.orientation(p1, q1, p2);
    const o2 = this.orientation(p1, q1, q2);
    const o3 = this.orientation(p2, q2, p1);
    const o4 = this.orientation(p2, q2, q1);

    if (o1 !== o2 && o3 !== o4) {
      return true;
    }
    if (o1 === 0 && this.onSegment(p1,p2,q1)) {
      return true;
    }
    if (o2 === 0 && this.onSegment(p1,q2,q1)) {
      return true;
    }
    if (o3 === 0 && this.onSegment(p2,p1,q2)) {
      return true;
    }
    if (o4 === 0 && this.onSegment(p2,q1,q2)) {
      return true;
    }
    return false;
  }

  orientation(p, q, r) {
    const val = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]);
    if (val === 0) {
      return 0;
    }
    return (val > 0) ? 1 : 2;
  }
  onSegment(p, q, r) {
    if (q[0] <= Math.max(p[0], r[0]) &&
        q[0] >= Math.min(p[0], r[0]) &&
        q[1] <= Math.max(p[1], r[1]) &&
        q[1] >= Math.min(p[1], r[1])) {
      return true;
    }
    return false;
  }
/*
  zoom(event, delta) {
    event.preventDefault();
    this.perspectiveScale = Math.round(this.perspectiveScale *(10 + (event.deltaY > 0 ? 1 : -1)) / 10);
    this.loadMap(this.celestialId, this.tileId, this.perspectiveScale);
  }
  */
}
