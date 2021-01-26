const {
    SimpleCommunication,
    DirectedCommunication
} = require('../../../dist/pera-swarm');

const { Robot } = require('../robot/robot');

const { NeoPixelAgent } = require('../agents');
const { LocalizationController } = require('../controllers');
const { DistanceSensorEmulator } = require('../emulators');

// Class for representing the robots level functionality
class Robots {
    /**
     * Robots constructor
     */
    constructor(swarm, mqttPublish) {
        if (swarm === undefined) throw new TypeError('Swarm unspecified');

        this.robotList = {};
        this.size = 0;
        this.updated = Date.now();
        this.swarm = swarm;
        this.mqttPublish = mqttPublish;
        this.debug = true;

        // Simple Communication Module
        this.simpleCommunication = new SimpleCommunication(
            this,
            this.mqttPublish,
            60,
            this.debug
        );

        // Directed Communication Module
        this.directedCommunication = new DirectedCommunication(
            this,
            this.mqttPublish,
            60,
            30,
            this.debug
        );

        // Distance Controller Module
        this.distanceSensor = new DistanceSensorEmulator(
            this,
            swarm.arenaConfig,
            this.mqttPublish
        );

        // NeoPixel Controller Module
        this.neopixel = new NeoPixelAgent(this.mqttPublish);

        // Localization Controller Module
        this.localization = new LocalizationController(this.mqttPublish);
    }

    /**
     * method for obtaining default routes
     */
    get defaultSubscriptionRoutes() {
        const commRoutes = [
            ...this.simpleCommunication.defaultSubscriptions(),
            ...this.directedCommunication.defaultSubscriptions(),
            // ...this.colorSensor.defaultSubscriptions(),
            ...this.distanceSensor.defaultSubscriptions(),
            // ...this.proximitySensor.defaultSubscriptions(),
            ...this.localization.defaultSubscriptions(),
            ...this.neopixel.defaultSubscriptions(),
            {
                topic: 'robot/live',
                type: 'JSON',
                allowRetained: false,
                subscribe: true,
                publish: false,
                handler: (msg, swarm) => {
                    // Heartbeat signal from the robots to server
                    // console.log('MQTT.Robot: robot/live', msg);

                    let robot = swarm.robots.findRobotById(msg.id);
                    if (robot !== -1) {
                        const heartbeat = robot.updateHeartbeat();
                        //console.log('Heatbeat of the robot', msg, 'is updated to', heartbeat);
                    } else {
                        // No robot found.
                        swarm.robots.createIfNotExists(msg.id, () => {
                            //console.log('A robot created', msg.id);
                        });
                    }
                }
            },
            {
                topic: 'robot/create',
                type: 'JSON',
                allowRetained: false,
                subscribe: true,
                publish: false,
                handler: (msg, swarm) => {
                    // Create a robot on simulator
                    console.log('MQTT.Robot: robot/create', msg);

                    const { id, heading, x, y } = msg;
                    const resp = swarm.robots.addRobot(id, heading, x, y);
                }
            }
        ];
        return commRoutes;
    }

    initialPublishers = [];

    robotBuilder = (id, heading, x, y) => {
        return new Robot(id, heading, x, y);
    };

    /**
     * method for adding a robot to the robotList
     * @param {number} id robot id
     * @param {number} heading heading coordinate
     * @param {number} x x coordinate
     * @param {number} y y coordinate
     * @param {number} z z coordinate, optional
     * @returns {number} id : if successful
     */
    addRobot = (id, heading, x, y, z) => {
        if (id === undefined) throw new TypeError('id unspecified');

        // only add a robot if the id doesn't exist
        if (this.isExistsRobot(id) === false) {
            // robot doesn't exists
            if (heading === undefined) this.robotList[id] = new Robot(id);

            if (z === undefined) {
                this.robotList[id] = new Robot(id, heading, x, y);
            } else if (z !== undefined) {
                this.robotList[id] = new Robot(id, heading, x, y, z);
            }
            this.size += 1;
            return id;
        }
    };

    /**
     * method for removing the robot by id
     * @param {number} id robot id
     * @param {function} callback a callback function
     * @returns {boolean} true : if successful
     * @returns false : if it fails
     */
    removeRobot = (id, callback) => {
        if (id === undefined) throw new TypeError('id unspecified');

        if (this.isExistsRobot(id)) {
            // remove the key along with the value.
            delete this.robotList[id];
            this.size--;
            this.updated = Date.now();
            this.mqttPublish('robot/delete', { id });
            if (callback !== undefined) callback(id);

            console.log(`robot:deleted > ${id}`);
            return true;
        }
        return false;
    };

    /**
     * method for getting the size of the robot robotList
     * @returns {number} the size of the robot instances : are in the list
     */
    getSize = () => {
        return this.size;
    };

    /**
     * method for finding a robot exists in the robotList or not
     * @param {number} id robot id
     * @returns nothing
     */

    createIfNotExists = (id, callback) => {
        if (id === undefined) throw new TypeError('id unspecified');
        if (this.isExistsRobot(id) == false) {
            this.addRobot(id); // robot doesn't exists
        }

        if (callback !== undefined) callback();
        return;
    };

    /**
     * method for finding a robot exists or not
     * @param {number} id robot id
     * @returns {boolean} true : if robot exists
     */
    isExistsRobot = (id) => {
        if (id === undefined) throw new TypeError('id unspecified');
        return this.robotList[id] != undefined;
    };

    /**
     * method for finding a robot alive or not
     * @param {number} id robot id
     * @param {number} interval considered time interval
     * @returns {boolean} true : if robot is alive
     * @returns false : if a robot doesn't alive
     */
    isAliveRobot = (id, interval) => {
        if (id === undefined) throw new TypeError('id unspecified');
        if (interval === undefined) throw new TypeError('interval unspecified');
        return this.robotList[id].isAlive(interval);
    };

    /**
     * method for finding the robot by id
     * @param {number} id robot id
     * @returns {Robot|number} the robot instance : if it exists
     * @returns -1 : if it doesn't exist
     */
    findRobotById = (id) => {
        if (id === undefined) throw new TypeError('id unspecified');

        let result = this.robotList[id];
        return result !== undefined ? result : -1;
    };

    /**
     * method for getting the robot coordinates by id
     * @param {number} id robot id
     * @returns {Coordinate|number} the robot coordinates : if it exists
     * @returns -1 : if it doesn't exist
     */
    getCoordinatesById = (id) => {
        if (id === undefined) throw new TypeError('id unspecified');

        if (this.isExistsRobot(id) === false) return -1;
        return this.findRobotById(id).getCoordinates();
    };

    /**
     * method for getting the robot coordinate string by id
     * @param {number} id robot id
     * @returns {String|number} the robot coordinate string : if it exists
     * @returns -1 : if it doesn't exist
     */
    getCoordinateStringById = (id) => {
        if (id === undefined) throw new TypeError('id unspecified');

        if (this.isExistsRobot(id) === false) return -1;

        const { x, y, heading } = this.findRobotById(id).getCoordinates();
        return `${x} ${y} ${heading}`;
    };

    /**
     * method for getting the coordinates of all robots
     * @returns {Coordinate[]} current robot coordinates : that are existing in the list
     */
    getCoordinatesAll = () => {
        let result = [];
        for (const key in this.robotList) {
            result.push(this.robotList[key].getCoordinates());
        }
        return result;
    };

    /**
     * method for updating the coordinates of the given robots coordinates data
     * @param {Coordinate[]} coordinates coordinate data
     */
    updateCoordinates = (coordinates) => {
        if (coordinates === undefined) throw new TypeError('coordinates unspecified');

        coordinates.forEach((item) => {
            const { id, x, y, heading } = item;
            if (this.isExistsRobot(id)) {
                //console.log(id, this.isExistsRobot(id));
                this.findRobotById(id).setCoordinateValues(heading, x, y);
            } else {
                //console.log('robot added', id);
                this.addRobot(id, heading, x, y);
            }
            this.updated = Date.now();
        });
    };

    /**
     * method for updating the coordinates of the given robots coordinates data
     * @param {number} interval the maximum allowed time in 'seconds' for being counted as 'alive' for a robot unit
     * @param {function} callback a callback function. 'id' will be given as a parameter
     */
    prune = (interval, callback) => {
        if (interval === undefined) throw new TypeError('interval unspecified');

        for (let id in this.robotList) {
            if (this.isAliveRobot(id, interval) == false) {
                this.removeRobot(id, callback);
            }
        }
    };

    broadcast = (instType, value, options = {}) => {
        if (instType === undefined) throw new TypeError('instruction type unspecified');
        if (value === undefined) throw new TypeError('value unspecified');

        const msg = `${instType} ${value}`;
        this.mqttPublish('robot/msg/broadcast', msg, options);
    };

    changeMode = (mode, options = {}) => {
        this.broadcast('MODE', value);
    };
}

const initRobots = () => {
    return new Robots(this.swarm);
};

module.exports = {
    Robots,
    initRobots
};
