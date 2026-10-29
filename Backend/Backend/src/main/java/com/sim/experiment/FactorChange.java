package com.sim.experiment;

import java.util.List;

/**
 * One conceptual configuration factor that differs between a baseline and a treatment.
 *
 * <p>Related persisted fields are grouped so that, for example, changing the partition
 * schedule counts as a single manipulated factor rather than several.</p>
 */
public class FactorChange {
    private final String factor;
    private final String label;
    private final String baselineValue;
    private final String treatmentValue;
    private final List<FieldChange> fieldChanges;

    public FactorChange(String factor, String label, String baselineValue, String treatmentValue,
            List<FieldChange> fieldChanges) {
        this.factor = factor;
        this.label = label;
        this.baselineValue = baselineValue;
        this.treatmentValue = treatmentValue;
        this.fieldChanges = List.copyOf(fieldChanges);
    }

    public String getFactor() { return factor; }
    public String getLabel() { return label; }
    /** Changed fields rendered as {@code field=value} pairs, joined for display. */
    public String getBaselineValue() { return baselineValue; }
    /** Changed fields rendered as {@code field=value} pairs, joined for display. */
    public String getTreatmentValue() { return treatmentValue; }
    public List<FieldChange> getFieldChanges() { return fieldChanges; }

    /** A single persisted configuration field that changed. */
    public static class FieldChange {
        private final String field;
        private final String baselineValue;
        private final String treatmentValue;

        public FieldChange(String field, String baselineValue, String treatmentValue) {
            this.field = field;
            this.baselineValue = baselineValue;
            this.treatmentValue = treatmentValue;
        }

        public String getField() { return field; }
        public String getBaselineValue() { return baselineValue; }
        public String getTreatmentValue() { return treatmentValue; }
    }
}
