const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const pluginFactory = require('../index');

describe('plugin', () => {
  const app = {
    debug: () => {},
    error: () => {},
    setPluginStatus: () => {},
    subscriptionmanager: {
      subscribe: () => {},
    },
  };
  const plugin = pluginFactory(app);

  it('has required interface', () => {
    assert.equal(typeof plugin.start, 'function');
    assert.equal(typeof plugin.stop, 'function');
    assert.ok(plugin.id);
  });

  it('starts and stops without error', () => {
    plugin.start({}, () => {});
    plugin.stop();
  });
});
