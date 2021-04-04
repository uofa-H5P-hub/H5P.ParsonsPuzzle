class StopWatch {
  /**
   * @class {StopWatch}
   * @constructor
   */
  constructor() {
    /**
     * @property {number} duration in ms
     */
    this.duration = 0;
  }

  /**
   * Starts the stop watch
   *
   * @return {StopWatch}
   */
  start(){
    /**
     * @property {number}
     */
    this.startTime = Date.now();
    return this;
  }

  /**
   * Stops the stopwatch, and returns the duration in seconds.
   *
   * @return {number}
   */
  stop(){
    this.duration = this.duration + Date.now() - this.startTime;
    return this.passedTime();
  }

  /**
   * Sets the duration to 0
   */
  reset(){
    this.duration = 0;
    this.startTime = Date.now();
  }

  /**
   * Returns the passed time in seconds
   *
   * @return {number}
   */
  passedTime(){
    return Math.round(this.duration / 10) / 100;
  }
};

export default StopWatch;