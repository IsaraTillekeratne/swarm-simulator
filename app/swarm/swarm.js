// Base Models
// const { Robot } = require('./robot');

// MQTT
const mqttClient = require('mqtt');
const mqttConfig = require('../config/mqtt.config');
const arenaConfig = require('../config/arena.config');

const { MQTTRouter, publishToTopic, wrapper } = require('../../dist/mqtt-router');
const { obstacleController } = require('../../dist/pera-swarm');

// MQTT Client module
const mqtt = mqttClient.connect(mqttConfig.HOST, mqttConfig.options);
// MQTT routes
const {
    localizationRoutes,
    sensorRoutes,
    robotRoutes,
    obstacleRoutes
} = require('./mqtt/');

// TODO: make as a module
const cron = require('../services/cron.js');

const { Robots } = require('./robots/robots');

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
        this.arenaConfig = arenaConfig;
        this.robots = new Robots(this, this.mqttPublish);
        this.mqttRouter = new MQTTRouter(
            mqtt,
            wrapper(
                [
                    ...robotRoutes,
                    ...localizationRoutes,
                    ...sensorRoutes,
                    ...obstacleRoutes,
                    //...communicationRoutes,
                    ...this.robots.defaultSubscriptionRoutes
                ],
                this
            ),
            mqttConfig,
            setup
        );
        this.mqttRouter.start();

        // Cron Jobs with defined intervals,
        // TODO: define intervals as global variables
        cron.begin(cron.secondsInterval(360), this.prune);
        cron.begin(cron.secondsInterval(30), this.broadcastCheckALive);

        // TODO: make a publish to topic '/localization/update'
        // More Info: https://pera-swarm.ce.pdn.ac.lk/docs/communication/mqtt/localization#localizationupdate

        // Make a publish to topic 'robot/msg/broadcast'
        this.broadcastCheckALive();

        // build the environment using ObstacleBuilder
        this.obstacleController = obstacleController();
        // const c = new CylinderObstacle(1, radius, height, originX, originY, true);
        this.obstacleController.createCylinder(10, 20, 15, 15, true);
        // this.obstacleController.c
    }

    prune = () => {
        console.log('Swarm_Prune');
        this.robots.prune(360); // TODO: define this as a global variable
    };

    broadcastCheckALive = () => {
        // Publish with retain:true, qos:atLeastOnce
        //console.log('Swarm_Check_a_Live');
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

        this.mqttRouter.pushToPublishQueue(topic, message.toString());
    };
}

module.exports = { Swarm };
