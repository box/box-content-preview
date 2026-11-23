import { getRepresentation } from '../../file';
import RepStatus from '../../RepStatus';
import { ORIGINAL_REP_NAME, STATUS_ERROR, STATUS_SUCCESS } from '../../constants';

export default function getOcrFallbackRepresentation(file) {
    const pdfRep = getRepresentation(file, 'pdf');

    if (pdfRep && RepStatus.getStatus(pdfRep) === STATUS_SUCCESS) {
        return pdfRep;
    }

    if (file.extension === 'pdf') {
        return getRepresentation(file, ORIGINAL_REP_NAME) || null;
    }

    return pdfRep && RepStatus.getStatus(pdfRep) !== STATUS_ERROR ? pdfRep : null;
}
