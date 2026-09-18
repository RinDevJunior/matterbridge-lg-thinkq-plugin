/**
 * Typed accessor over a ThinQ device's raw flat-key snapshot bag (e.g. `airState.opMode`).
 * Phase 1 only exposes the AirConditioner fields used by `ThinqDeviceConfigurator`.
 */
export class ThinqSnapshot {
	constructor(private readonly data: Record<string, unknown>) {}

	public get raw(): Record<string, unknown> {
		return this.data;
	}

	public get isPowerOn(): boolean {
		return Number(this.data['airState.operation']) === 1;
	}

	public get currentTemperatureCelsius(): number | undefined {
		return this.readNumber('airState.tempState.current');
	}

	public get targetTemperatureCelsius(): number | undefined {
		return this.readNumber('airState.tempState.target');
	}

	public get operationMode(): number | undefined {
		return this.readNumber('airState.opMode');
	}

	public get windStrength(): number | undefined {
		return this.readNumber('airState.windStrength');
	}

	public get online(): boolean | undefined {
		return typeof this.data.online === 'boolean' ? this.data.online : undefined;
	}

	public get isJetModeOn(): boolean {
		return Number(this.data['airState.wMode.jet']) === 1;
	}

	public get isQuietModeOn(): boolean {
		return Number(this.data['airState.miscFuncState.silentAWHP']) === 1;
	}

	public get isEnergySaveModeOn(): boolean {
		return Number(this.data['airState.powerSave.basic']) === 1;
	}

	public get isAirCleanModeOn(): boolean {
		return Number(this.data['airState.wMode.airClean']) === 1;
	}

	public get isLedOn(): boolean {
		return Number(this.data['airState.lightingState.displayControl']) === 1;
	}

	public get isVerticalSwingOn(): boolean {
		return Number(this.data['airState.wDir.vStep']) === 100;
	}

	public get isHorizontalSwingOn(): boolean {
		return Number(this.data['airState.wDir.hStep']) === 100;
	}

	public get humidityPercent(): number | undefined {
		const value = this.readNumber('airState.humidity.current');
		if (value === undefined) {
			return undefined;
		}
		return value > 100 ? value / 10 : value;
	}

	public get airQualityOverall(): number | undefined {
		return this.readNumber('airState.quality.overall');
	}

	public get pm25(): number | undefined {
		return this.readNumber('airState.quality.PM2');
	}

	public get pm10(): number | undefined {
		return this.readNumber('airState.quality.PM10');
	}

	public get powerConsumptionWatts(): number | undefined {
		const value = this.readNumber('airState.energy.onCurrent');
		if (value === undefined) {
			return undefined;
		}
		const watts = value / 100;
		return Number.isNaN(watts) ? undefined : watts;
	}

	private readNumber(key: string): number | undefined {
		const value = this.data[key];
		return typeof value === 'number' ? value : undefined;
	}
}
