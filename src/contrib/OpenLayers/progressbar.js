import './progressbar.css';


export default class ProgressBar {
  constructor(el, sources = []) {
    this.loaded = 0;
    this.loading = 0;
    this.el = el;

    this.addSources(sources);

    this.loadingListener = () => {
      this.addLoading();
    };

    this.loadedListener = () => {
      this.addLoaded();
    };
  }

  addSources(sources) {
    sources.forEach(source => this.addSource(source));
  }

  addSource(source) {
    source.on('tileloadstart', this.loadingListener);
    source.on('tileloadend', this.loadedListener);
    source.on('tileloaderror', this.loadedListener);
  }

  setElement(el = null) {
    this.el = el;
    if (this.el) {
      this.el.style.visibility = this.visible ? 'visible' : 'hidden';
      const width = `${(this.loaded / this.loading * 100).toFixed(1)}%`;
      this.el.style.width = width;
    }
  }

  show() {
    this.visible = true;
    if (this.el) {
      this.el.style.visibility = 'visible';
    }
  }

  hide() {
    this.visible = false;
    if (this.loading === this.loaded && this.el) {
      this.el.style.visibility = 'hidden';
      this.el.style.width = 0;
    }
  }

  addLoading() {
    if (this.loading === 0) {
      this.show();
    }
    ++this.loading;
    this.update();
  }

  addLoaded() {
    setTimeout(() => {
      ++this.loaded;
      this.update();
    }, 100);
  }

  isLoading() {
    return this.loading > this.loaded;
  }

  update() {
    if (!this.el) {
      return;
    }
    const width = `${(this.loaded / this.loading * 100).toFixed(1)}%`;
    this.el.style.width = width;
    if (this.loading === this.loaded) {
      this.loading = 0;
      this.loaded = 0;
      setTimeout(() => {
        this.hide();
      }, 500);
    }
  }
}
