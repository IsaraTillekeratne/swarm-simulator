import { AbstractArenaEmulator } from './';

export class VirtualArenaEmulator extends AbstractArenaEmulator {
    constructor(mqttPublish: Function) {
        super(mqttPublish);
    }

    defaultSubscriptions = () => {
        return [];
    };
}
