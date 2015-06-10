var DOM = require('../../util/dom'),
    Bounds = require('../../util/Bounds'),
    ImageLoader = require('../../util/ImageLoader'),
    Canvas = require('../../util/canvas'),
    Renderer = require('../Renderer'),
    marks = require('./marks');

function CanvasRenderer() {
  Renderer.call(this);
  this._loader = new ImageLoader();
}

var base = Renderer.prototype;
var prototype = (CanvasRenderer.prototype = Object.create(base));

prototype.initialize = function(el, width, height, padding) {
  this._canvas = Canvas.instance(width, height);
  if (el) DOM.appendUnique(el, 'canvas', 'marks');
  return base.initialize.call(this, el, width, height, padding);
};

prototype.resize = function(width, height, padding) {
  base.resize.call(this, width, height, padding);
  Canvas.resize(this._canvas, this._width, this._height, this._padding);
  return this;
};

prototype.canvas = function() {
  return this._canvas;
};

prototype.context = function() {
  return this._canvas ? this._canvas.getContext('2d') : null;
};

prototype.pendingImages = function() {
  return this._loader.pending();
};

function clipToBounds(g, items) {
  if (!items) return null;

  var b = new Bounds(), i, n, mark, item;
  for (i=0, n=items.length; i<n; ++i) {
    item = items[i];
    mark = item.mark;
    item = marks[mark.marktype].nested ? mark.items[0] : item;
    b.union(translate(item.bounds, item))
     .union(translate(item['bounds:prev'], item));
  }
  b.round();

  g.beginPath();
  g.rect(b.x1, b.y1, b.width(), b.height());
  g.clip();

  return b;
}

function translate(bounds, item) {
  var b = bounds.clone();
  while ((item = item.mark.group) != null) {
    b.translate(item.x || 0, item.y || 0);
  }
  return b;
}

prototype.render = function(scene, items) {
  var g = this.context(),
      p = this._padding,
      w = this._width + p.left + p.right,
      h = this._height + p.top + p.bottom,
      b;

  // setup
  this._scene = scene; // cache scene for async redraw
  g.save();
  b = clipToBounds(g, items);
  this.clear(-p.left, -p.top, w, h);

  // render
  this.draw(g, scene, b);
  
  // takedown
  g.restore();
  this._scene = null; // clear scene cache

  return this;
};

prototype.draw = function(ctx, scene, bounds) {
  var mark = marks[scene.marktype];
  mark.draw.call(this, ctx, scene, bounds);
};

prototype.clear = function(x, y, w, h) {
  var g = this.context();
  g.clearRect(x, y, w, h);
  if (this._bgcolor != null) {
    g.fillStyle = this._bgcolor;
    g.fillRect(x, y, w, h); 
  }
};

prototype.loadImage = function(uri) {
  var renderer = this,
      scene = this._scene;
  return this._loader.loadImage(uri, function() {
    renderer.renderAsync(scene);
  });
};

prototype.renderAsync = function(scene) {
  // TODO make safe for multiple scene rendering?
  var renderer = this;
  if (renderer._async_id) {
    clearTimeout(renderer._async_id);
  }
  renderer._async_id = setTimeout(function() {
    renderer.render(scene);
    delete renderer._async_id;
  }, 10);
};

module.exports = CanvasRenderer;
