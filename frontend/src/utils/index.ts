import { ExtractionStatus } from '../types';
export const getStatusColor = (status: ExtractionStatus) => {
  switch (status) {
    case ExtractionStatus.EXTRACTED:
      return 'success';
    case ExtractionStatus.EXTRACTING:
      return 'processing';
    case ExtractionStatus.INVALID:
      return 'warning';
    case ExtractionStatus.FAILED:
      return 'error';
    default:
      return 'default';
  }
};

export const getStatusText = (status: ExtractionStatus) => {
  switch (status) {
    case ExtractionStatus.SUBMITTING:
      return 'Submitting';
    case ExtractionStatus.EXTRACTING:
      return 'Extracting';
    case ExtractionStatus.EXTRACTED:
      return 'Done';
    case ExtractionStatus.INVALID:
      return 'Invalid';
    case ExtractionStatus.FAILED:
      return 'Failed';
    default:
      return status;
  }
};
