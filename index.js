module.exports = (app) => {
  const plugin = {};
  let unsubscribes = [];

  plugin.id = 'signalk-alternator-engine-on';
  plugin.name = 'Altenator engine status detector';
  plugin.description = 'Sets engine as running when alternator produces power';
  const setStatus = app.setPluginStatus || app.setProviderStatus;

  plugin.start = (options) => {
    const powerPath = options.alternator_path || 'electrical.chargers.alternator.power';
    const modePath = options.chargingmodePath || 'electrical.chargers.alternator.chargingMode';
    const subscription = {
      context: 'vessels.self',
      subscribe: [
        {
          path: powerPath,
          period: 100,
        },
        {
          path: modePath,
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
            if (v.path === powerPath && !options.use_chargingmode) {
              if (v.value > 0) {
                setState('started');
                return;
              }
              setState('stopped');
            } else if (v.path === modePath && options.use_chargingmode) {
              if (v.value == null) {
                return;
              }
              if (v.value === 'off' || v.value === 'OFF') {
                setState('stopped');
                return;
              }
              setState('started');
            }
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
      chargingmodePath: {
        type: 'string',
        default: 'electrical.chargers.alternator.chargingMode',
        title: 'Path used for monitoring alternator DC-DC charging mode (for example with Victron Orion XS)',
      },
      use_chargingmode: {
        type: 'boolean',
        default: false,
        title: 'Use charging mode instead of power to monitor engine state (recommended for Victron Orion XS)',
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
