import { AbstractVirtualEmulator } from '../';

export abstract class AbstractArenaEmulator extends AbstractVirtualEmulator {
    protected _mqttPublish: Function;

    constructor(mqttPublish: Function) {
        super();
        this._mqttPublish = mqttPublish;
    }

    publish = (topic: string, message: string) => {
        this._mqttPublish(topic, message);
    };

    abstract defaultSubscriptions: Function;
}

export * from './arena';
