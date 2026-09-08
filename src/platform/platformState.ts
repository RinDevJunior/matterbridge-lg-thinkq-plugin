/**
 * Platform state container.
 * Holds ephemeral runtime state for the platform (startup completion, etc.).
 * Uses strict types (no `any`) and provides simple accessor/mutator API.
 */
export class PlatformState {
	private startupCompleted = false;

	public get isStartupCompleted(): boolean {
		return this.startupCompleted;
	}

	public setStartupCompleted(completed: boolean): void {
		this.startupCompleted = completed;
	}
}
