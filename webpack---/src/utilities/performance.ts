export const hasPerformanceMeasureSupport = (): boolean => {
  const { performance } = window;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  return Boolean(performance) && Boolean(performance.measure);
};
