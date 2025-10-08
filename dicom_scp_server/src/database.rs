use sqlx::{PgPool, Row};
use uuid::Uuid;
use anyhow::Result;
use dicom_object::InMemDicomObject;

pub struct Database {
    pool: PgPool,
}

impl Database {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Store DICOM metadata in the database
    pub async fn store_dicom_metadata(
        &self,
        obj: &InMemDicomObject,
        file_path: &str,
        file_size: i64,
    ) -> Result<()> {
        // Extract DICOM tags
        let patient_id = get_string_value(obj, "PatientID").unwrap_or_else(|| "UNKNOWN".to_string());
        let patient_name = get_string_value(obj, "PatientName").unwrap_or_else(|| "UNKNOWN".to_string());
        let study_instance_uid = get_string_value(obj, "StudyInstanceUID").unwrap_or_else(|| generate_uid());
        let series_instance_uid = get_string_value(obj, "SeriesInstanceUID").unwrap_or_else(|| generate_uid());
        let sop_instance_uid = get_string_value(obj, "SOPInstanceUID").unwrap_or_else(|| generate_uid());
        let sop_class_uid = get_string_value(obj, "SOPClassUID").unwrap_or_default();

        // Get or create patient
        let patient_uuid = self.get_or_create_patient(
            &patient_id,
            &patient_name,
            get_string_value(obj, "PatientBirthDate").as_deref(),
            get_string_value(obj, "PatientSex").as_deref(),
        ).await?;

        // Get or create study
        let study_uuid = self.get_or_create_study(
            patient_uuid,
            &study_instance_uid,
            get_string_value(obj, "StudyID").as_deref(),
            get_string_value(obj, "StudyDate").as_deref(),
            get_string_value(obj, "StudyTime").as_deref(),
            get_string_value(obj, "StudyDescription").as_deref(),
            get_string_value(obj, "AccessionNumber").as_deref(),
            get_string_value(obj, "Modality").as_deref(),
        ).await?;

        // Get or create series
        let series_uuid = self.get_or_create_series(
            study_uuid,
            &series_instance_uid,
            get_integer_value(obj, "SeriesNumber"),
            get_string_value(obj, "SeriesDescription").as_deref(),
            get_string_value(obj, "Modality").as_deref(),
            get_string_value(obj, "BodyPartExamined").as_deref(),
        ).await?;

        // Create instance
        self.create_instance(
            series_uuid,
            &sop_instance_uid,
            &sop_class_uid,
            get_integer_value(obj, "InstanceNumber"),
            file_path,
            file_size,
            &obj.meta().transfer_syntax().to_string(),
            get_integer_value(obj, "Rows"),
            get_integer_value(obj, "Columns"),
            get_integer_value(obj, "BitsAllocated"),
        ).await?;

        // Increment series instance count
        self.increment_series_instances(series_uuid).await?;

        Ok(())
    }

    async fn get_or_create_patient(
        &self,
        patient_id: &str,
        patient_name: &str,
        birth_date: Option<&str>,
        sex: Option<&str>,
    ) -> Result<Uuid> {
        // Try to find existing patient
        let row = sqlx::query(
            "SELECT id FROM worklist_patient WHERE patient_id = $1 LIMIT 1"
        )
        .bind(patient_id)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            return Ok(row.get("id"));
        }

        // Create new patient
        let id = Uuid::new_v4();
        sqlx::query(
            r#"
            INSERT INTO worklist_patient (id, patient_id, patient_name, patient_birth_date, patient_sex, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            "#
        )
        .bind(id)
        .bind(patient_id)
        .bind(patient_name)
        .bind(birth_date)
        .bind(sex)
        .execute(&self.pool)
        .await?;

        Ok(id)
    }

    async fn get_or_create_study(
        &self,
        patient_id: Uuid,
        study_uid: &str,
        study_id: Option<&str>,
        study_date: Option<&str>,
        study_time: Option<&str>,
        description: Option<&str>,
        accession: Option<&str>,
        modality: Option<&str>,
    ) -> Result<Uuid> {
        let row = sqlx::query(
            "SELECT id FROM worklist_study WHERE study_instance_uid = $1 LIMIT 1"
        )
        .bind(study_uid)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            return Ok(row.get("id"));
        }

        let id = Uuid::new_v4();
        sqlx::query(
            r#"
            INSERT INTO worklist_study 
            (id, patient_id, study_instance_uid, study_id, study_date, study_time, 
             study_description, accession_number, modality, created_at, updated_at, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), 'completed')
            "#
        )
        .bind(id)
        .bind(patient_id)
        .bind(study_uid)
        .bind(study_id)
        .bind(study_date)
        .bind(study_time)
        .bind(description)
        .bind(accession)
        .bind(modality)
        .execute(&self.pool)
        .await?;

        Ok(id)
    }

    async fn get_or_create_series(
        &self,
        study_id: Uuid,
        series_uid: &str,
        series_number: Option<i32>,
        description: Option<&str>,
        modality: Option<&str>,
        body_part: Option<&str>,
    ) -> Result<Uuid> {
        let row = sqlx::query(
            "SELECT id FROM worklist_series WHERE series_instance_uid = $1 LIMIT 1"
        )
        .bind(series_uid)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            return Ok(row.get("id"));
        }

        let id = Uuid::new_v4();
        sqlx::query(
            r#"
            INSERT INTO worklist_series 
            (id, study_id, series_instance_uid, series_number, series_description, 
             modality, body_part_examined, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            "#
        )
        .bind(id)
        .bind(study_id)
        .bind(series_uid)
        .bind(series_number)
        .bind(description)
        .bind(modality)
        .bind(body_part)
        .execute(&self.pool)
        .await?;

        Ok(id)
    }

    async fn create_instance(
        &self,
        series_id: Uuid,
        sop_uid: &str,
        sop_class_uid: &str,
        instance_number: Option<i32>,
        file_path: &str,
        file_size: i64,
        transfer_syntax: &str,
        rows: Option<i32>,
        columns: Option<i32>,
        bits_allocated: Option<i32>,
    ) -> Result<Uuid> {
        let id = Uuid::new_v4();
        sqlx::query(
            r#"
            INSERT INTO worklist_dicomimage 
            (id, series_id, sop_instance_uid, sop_class_uid, instance_number, 
             dicom_file, file_size, transfer_syntax_uid, rows, columns, 
             bits_allocated, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
            ON CONFLICT (sop_instance_uid) DO NOTHING
            "#
        )
        .bind(id)
        .bind(series_id)
        .bind(sop_uid)
        .bind(sop_class_uid)
        .bind(instance_number)
        .bind(file_path)
        .bind(file_size)
        .bind(transfer_syntax)
        .bind(rows)
        .bind(columns)
        .bind(bits_allocated)
        .execute(&self.pool)
        .await?;

        Ok(id)
    }

    async fn increment_series_instances(&self, series_id: Uuid) -> Result<()> {
        sqlx::query(
            "UPDATE worklist_series SET updated_at = NOW() WHERE id = $1"
        )
        .bind(series_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}

fn get_string_value(obj: &InMemDicomObject, tag_name: &str) -> Option<String> {
    obj.element_by_name(tag_name)
        .ok()
        .and_then(|elem| elem.to_str().ok())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

fn get_integer_value(obj: &InMemDicomObject, tag_name: &str) -> Option<i32> {
    obj.element_by_name(tag_name)
        .ok()
        .and_then(|elem| elem.to_int::<i32>().ok())
}

fn generate_uid() -> String {
    format!("2.25.{}", Uuid::new_v4().as_u128())
}