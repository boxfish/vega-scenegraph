import Image from './util/canvas/image';
import {loader} from 'vega-loader';

export default function ResourceLoader(customLoader) {
  this._pending = 0;
  this._loader = customLoader || loader();
}

var prototype = ResourceLoader.prototype;

prototype.pending = function() {
  return this._pending;
};

function increment(loader) {
  loader._pending += 1;
}

function decrement(loader) {
  loader._pending -= 1;
}

prototype.sanitizeURL = function(uri) {
  var loader = this;
  increment(loader);

  return loader._loader.sanitize(uri, {context:'href'})
    .then(function(opt) {
      decrement(loader);
      return opt;
    })
    .catch(function() {
      decrement(loader);
      return null;
    });
};

prototype.loadImage = function(uri) {
  var loader = this;
  increment(loader);

  return loader._loader.sanitize(uri, {context:'image'})
    .then(function(opt) {
      var url = opt.href;
      if (!url || !Image) throw 'Image unsupported.';

      var image = new Image();

      image.onload = function() {
        decrement(loader);
        image.loaded = true;
      };

      image.onerror = function() {
        decrement(loader);
        image.loaded = false;
      }

      image.src = url;
      return image;
    })
    .catch(function() {
      decrement(loader);
      return {loaded: false, width: 0, height: 0};
    });
};

prototype.ready = function() {
  var loader = this;
  return new Promise(function(accept) {
    function poll(value) {
      if (!loader.pending()) accept(value);
      else setTimeout(function() { poll(true); }, 10);
    }
    poll(false);
  });
};
