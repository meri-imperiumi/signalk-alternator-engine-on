module.exports = (app) => {
  const plugin = {};
  let unsubscribes = [];

  plugin.id = 'signalk-alternator-engine-on';
  plugin.name = 'alternator-engine-on';
  plugin.description = 'Sets engine as running when alternator produces power';
  const setStatus = app.setPluginStatus || app.setProviderStatus;

  plugin.start = (options) => {
    const subscription = {
      context: 'vessels.self',
      subscribe: [
        {
          path: options.alternator_path || 'electrical.chargers.alternator.power',
          period: 100,
        },
      ],
    };

    function setState(state) {
      app.handleMessage(plugin.id, {
        context: `vessels.${app.selfId}`,
        updates: [
          {
            source: {
              label: plugin.id,
            },
            timestamp: (new Date().toISOString()),
            values: [
              {
                path: options.engine_path || 'propulsion.main.state',
                value: state,
              },
            ],
          },
        ],
      });
      setStatus(`Detected engine state: ${state}`);
    }

    app.subscriptionmanager.subscribe(
      subscription,
      unsubscribes,
      (subscriptionError) => {
        app.error(`Error:${subscriptionError}`);
      },
      (delta) => {
        if (!delta.updates) {
          return;
        }
        delta.updates.forEach((u) => {
          if (!u.values) {
            return;
          }
          u.values.forEach((v) => {
            if (v.value > 0) {
              setState('running');
              return;
            }
            setState('stopped');
          });
        });
      },
    );

    setStatus('Waiting for updates');
  };

  plugin.stop = () => {
    unsubscribes.forEach((f) => f());
    unsubscribes = [];
  };

  plugin.schema = {
    type: 'object',
    properties: {
      alternator_path: {
        type: 'string',
        default: 'electrical.chargers.alternator.power',
        title: 'Path used for monitoring alternator power',
      },
      engine_path: {
        type: 'string',
        default: 'propulsion.main.state',
        title: 'Path used for generated engine state',
      },
    },
  };

  return plugin;
};
