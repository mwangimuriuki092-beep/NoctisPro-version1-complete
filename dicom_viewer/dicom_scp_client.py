"""
DICOM SCU Client for communicating with Rust SCP Server
"""
import logging
from pynetdicom import AE, evt, StoragePresentationContexts
from pynetdicom.sop_class import VerificationSOPClass
from pydicom import dcmread
from django.conf import settings

logger = logging.getLogger(__name__)


class DicomScuClient:
    """Client for sending DICOM files to the Rust SCP Server"""
    
    def __init__(self):
        self.ae_title = getattr(settings, 'DICOM_SCU_AE_TITLE', 'DJANGO_SCU')
        self.scp_host = getattr(settings, 'DICOM_SCP_HOST', 'localhost')
        self.scp_port = getattr(settings, 'DICOM_SCP_PORT', 11112)
        self.scp_ae_title = getattr(settings, 'DICOM_SCP_AE_TITLE', 'RUST_SCP')
        
    def verify_connection(self):
        """Perform C-ECHO to verify connection"""
        ae = AE(ae_title=self.ae_title)
        ae.add_requested_context(VerificationSOPClass)
        
        try:
            assoc = ae.associate(
                self.scp_host,
                self.scp_port,
                ae_title=self.scp_ae_title
            )
            
            if assoc.is_established:
                status = assoc.send_c_echo()
                assoc.release()
                
                if status:
                    logger.info(f"C-ECHO successful: 0x{status.Status:04x}")
                    return True, "Connection successful"
                else:
                    return False, "C-ECHO failed"
            else:
                return False, "Association rejected"
        except Exception as e:
            logger.error(f"C-ECHO error: {e}")
            return False, str(e)
    
    def send_dicom(self, file_path):
        """Send DICOM file to SCP"""
        ae = AE(ae_title=self.ae_title)
        ae.requested_contexts = StoragePresentationContexts
        
        try:
            # Read DICOM file
            ds = dcmread(file_path)
            
            # Associate with SCP
            assoc = ae.associate(
                self.scp_host,
                self.scp_port,
                ae_title=self.scp_ae_title
            )
            
            if assoc.is_established:
                # Send C-STORE
                status = assoc.send_c_store(ds)
                assoc.release()
                
                if status:
                    logger.info(f"C-STORE successful: 0x{status.Status:04x}")
                    return True, "DICOM file sent successfully"
                else:
                    return False, "C-STORE failed"
            else:
                return False, "Association rejected"
        except Exception as e:
            logger.error(f"C-STORE error: {e}")
            return False, str(e)


# Global instance
dicom_scu_client = DicomScuClient()