// Main pera-swarm library components
const {
    obstacleController,
    DEFAULT_ROBOT_ALIVE_INTERVAL
} = require('../../dist/pera-swarm');

// MQTT
const mqttClient = require('mqtt');
const mqttConfig = require('../config/mqtt.config');
const { MQTTRouter, publishToTopic, wrapper } = require('../../dist/mqtt-router');

// MQTT Client module
const mqtt = mqttClient.connect(mqttConfig.HOST, mqttConfig.options);

// Customized components
const { Robots } = require('./controllers/robots');
const { schedulerService, SIXTY_SECONDS } = require('../services/cron.js');
const { EnvironmentController } = require('./controllers');

/**
 * @class Swarm Representation
 * @classdesc representing the customized swarm level functionality
 */
class Swarm {
    /**
     * @constructor Swarm constructor
     * @param {function} setup a fuction to run when the swarm object created
     */
    constructor(setup) {
        // Initiate the MQTT router for communication
        this.mqttRouter = new MQTTRouter(mqtt, wrapper([], this), mqttConfig, setup);
        this.mqttRouter.start();
        console.log('A', global.ARENA_CONFIG);
        const envSetup = process.env.ARENA_CONFIG;

        // Create the environment
        this.environment = new EnvironmentController(obstacleController(), envSetup);

        this.robots = new Robots(this, this.mqttPublish);

        // Cron Jobs with defined intervals
        schedulerService(this.prune, SIXTY_SECONDS);
        schedulerService(this.broadcastCheckALive);

        // Need some time for initiate the modules
        var self = this;
        setTimeout(function () {
            // Add default subscription routes
            self.mqttRouter.addRoutes(
                wrapper([...self.environment.defaultSubscriptionRoutes], self)
            );
            self.mqttRouter.addRoutes(
                wrapper([...self.robots.defaultSubscriptionRoutes], self)
            );

            // Add obstacles to the environment
            self.environment.createObstacles((obstacles) => {
                // Callback for publishing each obstacle into the environment
                self.mqttPublish('/obstacles', obstacles, {
                    retain: false
                });
            });
        }, 1000);

        const initialPublishers = [
            ...this.environment.initialPublishers,
            ...this.robots.initialPublishers
        ];

        // Initial Publishers according to swarm configuration
        initialPublishers.forEach((publisher) => {
            this.mqttPublish(publisher.topic, publisher.data, publisher.options);
        });
    }

    prune = () => {
        // console.log('Swarm_Prune');
        // Delete robots who are not active on last 5 mins (360 seconds)
        this.robots.prune(DEFAULT_ROBOT_ALIVE_INTERVAL);
    };

    broadcastCheckALive = () => {
        // console.log('Robot_ID_Broadcast');
        // Publish with retain:true, qos:atLeastOnce
        this.robots.broadcast('ID?', -1, { qos: 1, rap: true });
    };

    /**
     * method for publishing a message to a given topic
     * @param {string} topic mqtt topic
     * @param {string} message mqtt message object
     */
    mqttPublish = (topic, message, options = mqttConfig.mqttOptions) => {
        // Encode the JSON type messages
        if (typeof message === 'object') message = JSON.stringify(message);
        this.mqttRouter.pushToPublishQueue(topic, message.toString(), options);
        // publishToTopic(mqtt, topic, message.toString(), options);
    };

    updateEnvSetup(newEnvSetup) {
        console.log(newEnvSetup);
        this.envSetup = newEnvSetup;
        process.env.ARENA_CONFIG = newEnvSetup;
        // this.environment.clearEnvironment();
        const c = this.environment.readConfig(newEnvSetup);

        this.environment._obstacleController._list = [];
        // this.environment._obstacleController._arenaConfig = undefined;
        // this.environment._config.arena = {};
        console.log(this.environment._config.obstacles);
        // this.mqttPublish('/obstacles', [], {
        //     retain: false
        // });
        // this.environment = null;

        this.environment = new EnvironmentController(
            new obstacleController(),
            newEnvSetup
        );
        // this.environment._config.arena = c.arena;

        this.environment.createObstacles((obstacles) => {
            this.mqttPublish('/obstacles/delete/all', '?', {
                retain: false
            });

            // Callback for publishing each obstacle into the environment
            this.mqttPublish('/obstacles', obstacles, {
                retain: true
            });
            this.mqttPublish('/config/arena/', this.environment._config.arena, {
                retain: true
            });
        });
    }
}

module.exports = { Swarm };
