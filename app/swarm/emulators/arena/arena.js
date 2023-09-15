const { AbstractArenaEmulator } = require('../../../../dist/pera-swarm');
const fs = require('fs');
const path = require('path');
const Swarm = require('../../swarm');

// Define the relative path to the target folder from the current directory
const relativeFolderPath = '../../../config/arena';

// Construct the full path to the target folder
const folderPath = path.join(__dirname, relativeFolderPath);

var results = [];

class Arena extends AbstractArenaEmulator {
    /**
     * DistanceSensorEmulator
     * @param {Function} mqttPublish mqtt publish function
     */
    constructor(mqttPublish, swarmInstance) {
        super(mqttPublish);
        this.swarm = swarmInstance;
    }

    // setData = (robot, value) => {
    //     return robot.setData('distance', 400);
    // };

    get = () => {
        results = [];
        fs.readdir(folderPath, (err, files) => {
            if (err) {
                console.error('Error reading folder:', err);
                return;
            }

            // Loop through each file in the folder
            files.forEach((file) => {
                // Get the full file path
                const filePath = path.join(folderPath, file);

                // Check if the item is a file (not a directory)
                fs.stat(filePath, (statErr, stats) => {
                    if (statErr) {
                        console.error('Error getting file stats:', statErr);
                        return;
                    }

                    if (stats.isFile()) {
                        // Read the file content
                        fs.readFile(filePath, 'utf-8', (readErr, data) => {
                            if (readErr) {
                                console.error(`Error reading file "${file}":`, readErr);
                            } else {
                                // Print the file name and content
                                // console.log(`File Name: ${file}`);
                                // console.log(`File Content:\n${data}`);
                                try {
                                    const jsonData = JSON.parse(data);

                                    // Extract relevant information
                                    const fileName = file;
                                    const arenaInfo = jsonData.arena;
                                    const walls = jsonData.obstacles.filter(
                                        (obstacle) => obstacle.type === 'wall'
                                    );
                                    const cylinders = jsonData.obstacles.filter(
                                        (obstacle) => obstacle.type === 'cylinder'
                                    );

                                    const result = {
                                        fileName,
                                        arenaInfo,
                                        walls: walls.map((wall) => wall.name),
                                        cylinderCount: cylinders.length
                                    };

                                    results.push(result);
                                    // console.log('Pushed Result:', 'result');
                                    // Check if all files have been processed
                                    if (results.length === files.length) {
                                        this.publish('arena/details', results);
                                        console.log('publishing');
                                    }
                                } catch (parseErr) {
                                    console.error(
                                        `Error parsing JSON in file "${file}":`,
                                        parseErr
                                    );
                                }
                            }
                        });
                    }
                });
            });
        });
        // console.log(`results:${results.length}`);
    };

    
    setArena = (fileName) => {
        const ARENA_CONFIG = `./app/config/arena/${fileName}`;
        // this.publish('v1/obstacles/delete/all', '');
        // console.log(this.swarm.environment.obstacleController.visualizeObstacles());
        this.swarm.updateEnvSetup(ARENA_CONFIG);
        // updateConfigFile(
        //     `${__dirname}/../../../config/arena.config.js`,
        //     `./app/config/arena/${fileName}`
        // );
    };

    getArenaJson = (fileName) => {
        results = []
        fs.readdir(folderPath, (err, files) => {
            if (err) {
                console.error('Error reading folder:', err);
                return;
            }

            // Loop through each file in the folder
            files.forEach((file) => {
                // Get the full file path
                const filePath = path.join(folderPath, file);

                // Check if the item is a file (not a directory)
                fs.stat(filePath, (statErr, stats) => {
                    if (statErr) {
                        console.error('Error getting file stats:', statErr);
                        return;
                    }

                    if (stats.isFile()) {
                        // Read the file content
                        if(file===fileName){
                            fs.readFile(filePath, 'utf-8', (readErr, data) => {
                                if (readErr) {
                                    console.error(`Error reading file "${file}":`, readErr);
                                } else {
                                    
                                    try {
                                        const jsonData = JSON.parse(data);
                                        results.push(jsonData)
                                        this.publish('arena/arenaJson', results);
                                        
                                    } catch (parseErr) {
                                        console.error(
                                            `Error parsing JSON in file "${file}":`,
                                            parseErr
                                        );
                                    }
                                }
                            });
                        }
                        
                    }
                });
            });
        });
        
    };

    defaultSubscriptions = () => {
        return [
            {
                topic: 'arena/get',
                type: 'JSON',
                allowRetained: false,
                subscribe: true,
                publish: true,
                handler: (msg) => {
                    console.log(msg);
                    this.get();
                }
            },
            {
                topic: 'arena/set',
                type: 'JSON',
                allowRetained: false,
                subscribe: true,
                publish: true,
                handler: (msg) => {
                    console.log(msg);
                    this.setArena(msg);
                }
            },
            {
                topic: 'arena/getArenaJson',
                type: 'JSON',
                allowRetained: false,
                subscribe: true,
                publish: true,
                handler: (msg) => {
                    console.log(msg);
                    this.getArenaJson(msg);
                }
            }
        ];
    };
}

module.exports = { Arena };
