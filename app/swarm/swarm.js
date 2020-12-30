// Base Models
// const { Robot } = require('./robot');

// MQTT
const mqttClient = require('mqtt');
const mqttConfig = require('../config/mqtt.config');
const arenaConfig = require('../config/arena.config');

const { MQTTRouter, publishToTopic, wrapper } = require('@pera-swarm/mqtt-router');

// MQTT Client module
const mqtt = mqttClient.connect(mqttConfig.HOST, mqttConfig.options);

// cron - currently not implemented
const cron = require('../services/cron.js');

// Localization System
const { SimpleLocalizationSystem } = require('pera-swarm');

// MQTT Controllers
const { localizationRoutes, sensorRoutes, controlRoutes } = require('./mqtt/');

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
        this.loc_system = new SimpleLocalizationSystem();

        // TODO: pass mqtt, swarm functions to Robots object
        this.arenaConfig = arenaConfig;

        this.mqttRouter = new MQTTRouter(
            mqtt,
            wrapper([...controlRoutes, ...localizationRoutes, ...sensorRoutes], this),
            mqttConfig,
            setup
        );
        this.mqttRouter.start();

        // Cron Jobs with defined intervals, // TODO: define intervals as global variables
        cron.begin(cron.secondsInterval(360), this.prune);
        cron.begin(cron.secondsInterval(360), this.broadcastCheckALive);

        this.robots = new Robots(this);
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
    mqttPublish = (topic, message, options = mqttConfig.mqttOptions, callback) => {
        // Encode the JSON type messages
        if (typeof message === 'object') message = JSON.stringify(message);

        publishToTopic(mqtt, topic, message.toString(), options, () => {
            //console.log(`MQTT_Publish > ${message} to topic ${topic}`);
            if (callback !== undefined) callback();
        });
    };
}

module.exports = { Swarm };
