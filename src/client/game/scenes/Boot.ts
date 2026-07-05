import * as Phaser from 'phaser';
import { COLORS } from '../ui';

export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    //  No boot assets — a plain fill keeps the first paint instant.
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.scene.start('Preloader');
  }
}
