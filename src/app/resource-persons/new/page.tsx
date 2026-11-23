'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import {
  validateSriLankanNic,
  validateSriLankanPassport,
  validateForeignPassport,
  validatePhone,
  validateEmail,
  findSimilarResourcePersons,
  POPULAR_COUNTRIES,
  NicValidationResult,
  PassportValidationResult,
  SimilarityMatchResult,
} from '@/lib/idValidation';

interface WorkshopOption {
  id: string;
  workshopNumber: string;
  title: string;
  subject: string;
  year: string;
  placeName: string;
}

interface ExistingResourcePerson {
  id: string;
  workshopId?: string;
  workshopTitle?: string | null;
  workshopNumber?: string | null;
  serialNumber?: number;
  personType?: 'local' | 'foreign';
  nic?: string;
  passportNumber?: string;
  citizenship?: string;
  country?: string;
  name: string;
  position?: string;
  service?: string;
  grade?: string;
  workplace?: string;
  personalAddress?: string;
  educationalQualifications?: string;
  subjectQualifications?: string;
  phone?: string;
  email?: string;
  specialNotes?: string;
  roleInWorkshop?: string;
}

export default function RegisterResourcePersonPage() {
  const router = useRouter();

  // Workshops for optional assignment
  const [workshops, setWorkshops] = useState<WorkshopOption[]>([]);
  const [loadingWorkshops, setLoadingWorkshops] = useState(false);

  // All existing resource persons in system (for live client-side duplicate detection)
  const [allResourcePersons, setAllResourcePersons] = useState<ExistingResourcePerson[]>([]);
  const [loadingAllRps, setLoadingAllRps] = useState(false);

  // ── Unified Form State (Single Source of Truth) ──
  const [formData, setFormData] = useState({
    workshopId: '',
    serialNumber: '1',
    personType: 'local' as 'local' | 'foreign',
    nic: '',
    passportNumber: '',
    citizenship: 'Sri Lanka',
    country: 'Sri Lanka',
    name: '',
    position: '',
    service: '',
    grade: '',
    workplace: '',
    personalAddress: '',
    phone: '',
    email: '',
    educationalQualifications: '',
    subjectQualifications: '',
    specialNotes: '',
    roleInWorkshop: 'Lead Facilitator',
  });

  // Country selector helper for foreign mode
  const [selectedForeignCountry, setSelectedForeignCountry] = useState('India');
  const [isCustomCountry, setIsCustomCountry] = useState(false);
  const [customCountryName, setCustomCountryName] = useState('');

  // Explicit Verification gateway feedback state (when clicking "Verify & Search")
  const [manualCheckFeedback, setManualCheckFeedback] = useState<{
    type: 'clean' | 'duplicate' | 'error';
    text: string;
  } | null>(null);

  // Validation & Duplicate acknowledgment
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorList, setErrorList] = useState<string[]>([]);
  const [confirmDifferentPerson, setConfirmDifferentPerson] = useState(false);

  // Submission state
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successInfo, setSuccessInfo] = useState<{
    id: string;
    name: string;
    workshopTitle?: string;
  } | null>(null);

  // Form container ref for smooth scrolling to top on success
  const topRef = useRef<HTMLDivElement>(null);
  const errorAlertRef = useRef<HTMLDivElement>(null);

  // ── Load Initial Data (Workshops & Resource Persons) ──
  useEffect(() => {
    async function loadData() {
      setLoadingWorkshops(true);
      setLoadingAllRps(true);
      try {
        const [wsRes, rpRes] = await Promise.all([
          fetch('/api/workshops'),
          fetch('/api/resource-persons'),
        ]);

        if (wsRes.ok) {
          const wsData = await wsRes.json();
          setWorkshops(wsData.workshops || []);
        }

        if (rpRes.ok) {
          const rpData = await rpRes.json();
          const list: ExistingResourcePerson[] = rpData.resourcePersons || [];
          setAllResourcePersons(list);

          const maxSerial = list.reduce((m, r) => Math.max(m, r.serialNumber || 0), 0);
          setFormData((prev) => ({
            ...prev,
            serialNumber: (maxSerial + 1).toString(),
          }));
        }
      } catch (err) {
        console.error('Error loading initial registry data:', err);
      } finally {
        setLoadingWorkshops(false);
        setLoadingAllRps(false);
      }
    }
    loadData();
  }, []);

  // ── Live NIC Format Validation & Decoding ──
  const nicValidation: NicValidationResult | null = useMemo(() => {
    if (formData.personType !== 'local') return null;
    if (!formData.nic.trim()) return null;
    return validateSriLankanNic(formData.nic);
  }, [formData.nic, formData.personType]);

  // ── Live Passport Validation ──
  const passportValidation: PassportValidationResult | null = useMemo(() => {
    if (!formData.passportNumber.trim()) return null;
    if (formData.personType === 'local') {
      return validateSriLankanPassport(formData.passportNumber);
    } else {
      return validateForeignPassport(formData.passportNumber);
    }
  }, [formData.passportNumber, formData.personType]);

  // ── Live Exact Duplicate Detection for NIC / Passport ──
  const exactDuplicate: ExistingResourcePerson | null = useMemo(() => {
    if (formData.personType === 'local') {
      const cleanNic = formData.nic.trim().toUpperCase();
      if (cleanNic) {
        const found = allResourcePersons.find((r) => {
          const rNic = (r.nic || '').trim().toUpperCase();
          if (!rNic) return false;
          if (rNic === cleanNic) return true;
          if (nicValidation?.equivalentNic && rNic === nicValidation.equivalentNic) return true;
          if (nicValidation?.normalizedNic && rNic === nicValidation.normalizedNic) return true;
          return false;
        });
        if (found) return found;
      }

      const cleanPass = formData.passportNumber.trim().toUpperCase();
      if (cleanPass) {
        const foundP = allResourcePersons.find(
          (r) => (r.passportNumber || '').trim().toUpperCase() === cleanPass
        );
        if (foundP) return foundP;
      }
    } else {
      // Foreign
      const cleanPass = formData.passportNumber.trim().toUpperCase();
      if (cleanPass) {
        const foundF = allResourcePersons.find(
          (r) => (r.passportNumber || '').trim().toUpperCase() === cleanPass
        );
        if (foundF) return foundF;
      }
    }
    return null;
  }, [formData.nic, formData.passportNumber, formData.personType, nicValidation, allResourcePersons]);

  // ── Live Similarity Matching for Name / Common Attributes ──
  const potentialDuplicates: SimilarityMatchResult[] = useMemo(() => {
    if (!formData.name.trim() && !formData.phone.trim() && !formData.email.trim()) {
      return [];
    }
    const candidate = {
      name: formData.name,
      nic: formData.nic,
      passportNumber: formData.passportNumber,
      phone: formData.phone,
      email: formData.email,
      workplace: formData.workplace,
    };
    return findSimilarResourcePersons(candidate, allResourcePersons);
  }, [formData.name, formData.nic, formData.passportNumber, formData.phone, formData.email, formData.workplace, allResourcePersons]);

  // ── Handle Person Type Switching ──
  const handleSwitchPersonType = (type: 'local' | 'foreign') => {
    setFieldErrors({});
    setErrorList([]);
    setServerError('');
    setManualCheckFeedback(null);
    setConfirmDifferentPerson(false);

    if (type === 'local') {
      setFormData((prev) => ({
        ...prev,
        personType: 'local',
        citizenship: 'Sri Lanka',
        country: 'Sri Lanka',
        passportNumber: '',
      }));
    } else {
      const countryVal = isCustomCountry ? customCountryName.trim() : selectedForeignCountry;
      setFormData((prev) => ({
        ...prev,
        personType: 'foreign',
        citizenship: countryVal || 'India',
        country: countryVal || 'India',
        nic: '',
      }));
    }
  };

  // ── Manual "Verify & Search Identity" Button Handler ──
  const handleManualVerify = () => {
    setServerError('');
    setFieldErrors({});
    setErrorList([]);

    if (formData.personType === 'local') {
      if (!formData.nic.trim() && !formData.passportNumber.trim()) {
        setManualCheckFeedback({
          type: 'error',
          text: 'Please enter a Sri Lankan National Identity Card (NIC) number or Passport number to verify.',
        });
        return;
      }

      if (formData.nic.trim()) {
        const val = validateSriLankanNic(formData.nic);
        if (!val.isValid) {
          setManualCheckFeedback({
            type: 'error',
            text: val.error || 'Invalid NIC format.',
          });
          return;
        }
      }

      if (formData.passportNumber.trim()) {
        const pVal = validateSriLankanPassport(formData.passportNumber);
        if (!pVal.isValid) {
          setManualCheckFeedback({
            type: 'error',
            text: pVal.error || 'Invalid Sri Lankan passport format.',
          });
          return;
        }
      }

      if (exactDuplicate) {
        setManualCheckFeedback({
          type: 'duplicate',
          text: `Resource person "${exactDuplicate.name}" is ALREADY registered with this ${formData.nic ? `NIC (${exactDuplicate.nic || formData.nic})` : `Passport (${exactDuplicate.passportNumber})`}.`,
        });
        return;
      }

      setManualCheckFeedback({
        type: 'clean',
        text: `✅ Identity Verified: No registered record exists for ${formData.nic ? `NIC ${formData.nic}` : ''} ${formData.passportNumber ? `Passport ${formData.passportNumber}` : ''}. You may complete the profile details below.`,
      });
    } else {
      // Foreign
      const countryVal = isCustomCountry ? customCountryName.trim() : selectedForeignCountry;
      if (!countryVal) {
        setManualCheckFeedback({
          type: 'error',
          text: 'Please select or enter the citizenship / country of the foreign resource person.',
        });
        return;
      }
      if (!formData.passportNumber.trim()) {
        setManualCheckFeedback({
          type: 'error',
          text: 'Please enter the foreign passport number to search.',
        });
        return;
      }

      const pVal = validateForeignPassport(formData.passportNumber);
      if (!pVal.isValid) {
        setManualCheckFeedback({
          type: 'error',
          text: pVal.error || 'Invalid foreign passport format.',
        });
        return;
      }

      if (exactDuplicate) {
        setManualCheckFeedback({
          type: 'duplicate',
          text: `Foreign Resource Person "${exactDuplicate.name}" (${exactDuplicate.citizenship || exactDuplicate.country}) is ALREADY registered with Passport (${exactDuplicate.passportNumber}).`,
        });
        return;
      }

      setManualCheckFeedback({
        type: 'clean',
        text: `✅ Verified: No existing record found for Foreign Passport (${pVal.normalized}, ${countryVal}). You may proceed to complete the profile details below.`,
      });
    }
  };

  // ── Handle Field Change ──
  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setManualCheckFeedback(null);

    // Clear specific field error
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }

    // Reset general error list on edit
    if (errorList.length > 0) {
      setErrorList([]);
    }
    if (serverError) {
      setServerError('');
    }
  };

  // ── Client-Side Form Validation ──
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    const messages: string[] = [];

    // 1. Name Validation
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errs.name = 'Full name is required (minimum 2 characters).';
      messages.push('Please enter the Full Name of the resource person.');
    }

    // 2. Identity Validation
    if (formData.personType === 'local') {
      if (!formData.nic.trim() && !formData.passportNumber.trim()) {
        errs.nic = 'National Identity Card (NIC) is required for Sri Lankan resource persons.';
        messages.push('Please enter a Sri Lankan National Identity Card (NIC) number (or Sri Lankan Passport).');
      } else if (formData.nic.trim()) {
        const nicCheck = validateSriLankanNic(formData.nic);
        if (!nicCheck.isValid) {
          errs.nic = nicCheck.error || 'Invalid Sri Lankan NIC format.';
          messages.push(`NIC Format Error: ${nicCheck.error || 'Please enter a valid Old (9 digits + V/X) or New (12 digits) NIC.'}`);
        }
      }

      if (formData.passportNumber.trim()) {
        const passCheck = validateSriLankanPassport(formData.passportNumber);
        if (!passCheck.isValid) {
          errs.passportNumber = passCheck.error || 'Invalid Sri Lankan passport number.';
          messages.push(`Passport Format Error: ${passCheck.error}`);
        }
      }
    } else {
      // Foreign
      if (!formData.country.trim()) {
        errs.country = 'Citizenship / Country is required for foreign resource persons.';
        messages.push('Please select or specify the Country / Citizenship of the foreign resource person.');
      }
      if (!formData.passportNumber.trim()) {
        errs.passportNumber = 'Passport number is required for foreign resource persons.';
        messages.push('Please enter the Foreign Passport Number.');
      } else {
        const passCheck = validateForeignPassport(formData.passportNumber);
        if (!passCheck.isValid) {
          errs.passportNumber = passCheck.error || 'Invalid passport format.';
          messages.push(`Passport Format Error: ${passCheck.error}`);
        }
      }
    }

    // Exact Duplicate Check
    if (exactDuplicate) {
      const idStr = exactDuplicate.nic || exactDuplicate.passportNumber;
      errs.nic = `Duplicate identity: Already registered as "${exactDuplicate.name}" (${idStr}).`;
      messages.push(`Exact Duplicate: A resource person with this identity is ALREADY registered: "${exactDuplicate.name}" (${idStr}).`);
    }

    // 3. Optional Contact Info Format
    if (formData.phone.trim()) {
      const phCheck = validatePhone(formData.phone);
      if (!phCheck.isValid) {
        errs.phone = phCheck.error || 'Invalid telephone number.';
        messages.push(`Phone Error: ${phCheck.error}`);
      }
    }

    if (formData.email.trim()) {
      const emCheck = validateEmail(formData.email);
      if (!emCheck.isValid) {
        errs.email = emCheck.error || 'Invalid email address.';
        messages.push(`Email Error: ${emCheck.error}`);
      }
    }

    setFieldErrors(errs);
    setErrorList(messages);

    return messages.length === 0;
  };

  // ── Submit & Register Handler ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    const isValid = validateForm();
    if (!isValid) {
      // Scroll smoothly down to the error banner or first error field
      setTimeout(() => {
        if (errorAlertRef.current) {
          errorAlertRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
      return;
    }

    // High duplicate similarity blocker unless explicitly confirmed
    const topMatch = potentialDuplicates[0];
    if (topMatch && topMatch.score >= 80 && !confirmDifferentPerson) {
      setErrorList([
        `Duplicate Warning: A highly similar resource person ("${topMatch.existingRecord.name}") was detected (${topMatch.score}% match). Please review the duplicate comparison table above and tick the confirmation checkbox if this is a different individual.`,
      ]);
      setTimeout(() => {
        if (errorAlertRef.current) {
          errorAlertRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
      return;
    }

    // Apply smart defaults for optional workplace/position
    const finalPayload = {
      ...formData,
      position: formData.position.trim() || 'Resource Person',
      workplace: formData.workplace.trim() || 'Ministry of Education',
      forceDuplicate: confirmDifferentPerson,
    };

    setSaving(true);

    try {
      const res = await fetch('/api/resource-persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register resource person');
      }

      const assignedWs = workshops.find((w) => w.id === formData.workshopId);
      setSuccessInfo({
        id: data.resourcePerson.id,
        name: data.resourcePerson.name,
        workshopTitle: assignedWs ? `${assignedWs.workshopNumber} - ${assignedWs.title}` : undefined,
      });

      // Update cached resource persons
      setAllResourcePersons((prev) => [...prev, data.resourcePerson]);

      // Scroll smoothly to top to show success banner
      if (topRef.current) {
        topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err: any) {
      setServerError(err.message || 'An error occurred while saving.');
      setErrorList([err.message || 'An unexpected error occurred while saving.']);
      setTimeout(() => {
        if (errorAlertRef.current) {
          errorAlertRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    } finally {
      setSaving(false);
    }
  };

  // ── Reset Form Handler ──
  const handleResetForm = () => {
    setSuccessInfo(null);
    setFieldErrors({});
    setErrorList([]);
    setServerError('');
    setManualCheckFeedback(null);
    setConfirmDifferentPerson(false);

    const maxSerial = allResourcePersons.reduce((m, r) => Math.max(m, r.serialNumber || 0), 0);
    setFormData({
      workshopId: '',
      serialNumber: (maxSerial + 1).toString(),
      personType: 'local',
      nic: '',
      passportNumber: '',
      citizenship: 'Sri Lanka',
      country: 'Sri Lanka',
      name: '',
      position: '',
      service: '',
      grade: '',
      workplace: '',
      personalAddress: '',
      phone: '',
      email: '',
      educationalQualifications: '',
      subjectQualifications: '',
      specialNotes: '',
      roleInWorkshop: 'Lead Facilitator',
    });

    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <AppShell>
      <div ref={topRef} className="page-container" style={{ maxWidth: '1020px', margin: '0 auto', paddingBottom: '3.5rem' }}>

        {/* ── Page Header ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid var(--border-light)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <span className="badge badge-primary" style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', fontWeight: 600 }}>
                National Resource Registry
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                Ministry of Education Sri Lanka
              </span>
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--primary)', margin: 0, letterSpacing: '-0.02em' }}>
              Register Resource Person
            </h1>
            <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Register qualified local and international resource persons into the national directory with automated NIC/Passport validation, live duplicate prevention, and optional workshop assignment.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <Link href="/resource-persons" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>👥</span> View All Resource Persons
            </Link>
            <Link href="/budget-forecasting" className="btn btn-ghost btn-sm">
              Back to Main Menu
            </Link>
          </div>
        </div>

        {/* ── Success Banner ── */}
        {successInfo && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 83, 78, 0.08), rgba(0, 83, 78, 0.15))',
            border: '2px solid var(--teal)',
            borderRadius: '10px',
            padding: '1.5rem 1.75rem',
            marginBottom: '2rem',
            boxShadow: '0 4px 16px rgba(0, 83, 78, 0.12)',
            animation: 'fadeIn 0.3s ease-in-out',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'var(--teal)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                flexShrink: 0
              }}>
                ✓
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, color: 'var(--teal-dark)', fontSize: '1.2rem', fontWeight: 800 }}>
                    Resource Person Registered Successfully!
                  </h3>
                  <span className="badge" style={{ background: 'var(--teal)', color: '#fff', fontSize: '0.72rem' }}>
                    Verified & Recorded
                  </span>
                </div>
                <p style={{ margin: '0.4rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5 }}>
                  <strong>{successInfo.name}</strong> has been successfully registered in the Ministry of Education National Resource Registry.
                  {successInfo.workshopTitle ? (
                    <span> Assigned to workshop: <strong>{successInfo.workshopTitle}</strong>.</span>
                  ) : (
                    <span> Stored directly in the <strong>Master Resource Pool</strong> for future deployment across workshops.</span>
                  )}
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="btn btn-primary btn-sm"
                    style={{ background: 'var(--teal)', borderColor: 'var(--teal)', fontWeight: 700 }}
                  >
                    ➕ Register Another Resource Person
                  </button>
                  <Link href="/resource-persons" className="btn btn-secondary btn-sm" style={{ fontWeight: 600 }}>
                    👥 Open Resource Persons Directory
                  </Link>
                  <Link href="/budget-forecasting" className="btn btn-ghost btn-sm">
                    Return to Main Menu
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            MAIN UNIFIED REGISTRATION FORM
            ══════════════════════════════════════════════════════════════════ */}
        <form onSubmit={handleSubmit} noValidate>

          {/* ══════════════════════════════════════════════════════════════════
              SECTION 1: CITIZEN CATEGORY & PRE-REGISTRATION IDENTITY CHECK
              ══════════════════════════════════════════════════════════════════ */}
          <div className="card" style={{
            padding: '1.75rem 2rem',
            marginBottom: '2rem',
            border: '1.5px solid var(--primary-light)',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%)',
            boxShadow: '0 4px 16px rgba(141, 21, 58, 0.06)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🔍</span> 1. Identification & Pre-Registration Verification
                </h2>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                  Enter National ID or Passport to verify identity and check for previous registrations in the national database.
                </p>
              </div>

              {/* Citizen Category Selector */}
              <div style={{ display: 'flex', background: 'var(--bg-light)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <button
                  type="button"
                  id="tab-local-citizen"
                  onClick={() => handleSwitchPersonType('local')}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: formData.personType === 'local' ? 'var(--primary)' : 'transparent',
                    color: formData.personType === 'local' ? '#fff' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>🇱🇰</span> Sri Lankan Citizen
                </button>
                <button
                  type="button"
                  id="tab-foreign-citizen"
                  onClick={() => handleSwitchPersonType('foreign')}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: formData.personType === 'foreign' ? 'var(--primary)' : 'transparent',
                    color: formData.personType === 'foreign' ? '#fff' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>🌐</span> Foreign Resource Person
                </button>
              </div>
            </div>

            {/* ── Identity Inputs: Sri Lankan Citizen Mode ── */}
            {formData.personType === 'local' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr auto', gap: '1rem', alignItems: 'flex-start' }}>
                <div>
                  <label htmlFor="input-nic" className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                    Sri Lankan National Identity Card (NIC) <span className="required" style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input
                    id="input-nic"
                    type="text"
                    className="form-input"
                    placeholder="Old: 851234567V / New: 198512304567"
                    value={formData.nic}
                    onChange={(e) => handleFieldChange('nic', e.target.value.toUpperCase())}
                    style={{
                      borderColor: fieldErrors.nic ? 'var(--error)' : nicValidation ? (nicValidation.isValid ? 'var(--teal)' : 'var(--accent)') : undefined,
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase'
                    }}
                  />

                  {/* Live NIC Format & Demographic Feedback */}
                  {nicValidation && (
                    <div style={{
                      marginTop: '0.4rem',
                      fontSize: '0.78rem',
                      color: nicValidation.isValid ? 'var(--teal-dark)' : 'var(--error)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: nicValidation.isValid ? 'rgba(0, 83, 78, 0.06)' : 'rgba(211, 47, 47, 0.06)',
                      padding: '0.35rem 0.6rem',
                      borderRadius: '6px'
                    }}>
                      <span>{nicValidation.isValid ? '✓' : '⚠️'}</span>
                      {nicValidation.isValid ? (
                        <span>
                          <strong>{nicValidation.type}</strong> • Year: {nicValidation.birthYear} • {nicValidation.gender} • Est. DOB: {nicValidation.dobFormatted}
                          {nicValidation.equivalentNic && ` (Equiv: ${nicValidation.equivalentNic})`}
                        </span>
                      ) : (
                        <span>{nicValidation.error}</span>
                      )}
                    </div>
                  )}
                  {fieldErrors.nic && (
                    <div style={{ color: 'var(--error)', fontSize: '0.78rem', marginTop: '0.3rem', fontWeight: 600 }}>
                      ⚠️ {fieldErrors.nic}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="input-passport-sl" className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                    Sri Lankan Passport <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    id="input-passport-sl"
                    type="text"
                    className="form-input"
                    placeholder="e.g. N1234567"
                    value={formData.passportNumber}
                    onChange={(e) => handleFieldChange('passportNumber', e.target.value.toUpperCase())}
                    style={{
                      borderColor: passportValidation ? (passportValidation.isValid ? 'var(--teal)' : 'var(--error)') : undefined,
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}
                  />
                  {passportValidation && (
                    <div style={{
                      marginTop: '0.4rem',
                      fontSize: '0.78rem',
                      color: passportValidation.isValid ? 'var(--teal-dark)' : 'var(--error)',
                      fontWeight: 600,
                      padding: '0.35rem 0.6rem',
                      background: passportValidation.isValid ? 'rgba(0, 83, 78, 0.06)' : 'rgba(211, 47, 47, 0.06)',
                      borderRadius: '6px'
                    }}>
                      {passportValidation.isValid ? '✓ Valid Sri Lankan passport format' : passportValidation.error}
                    </div>
                  )}
                  {fieldErrors.passportNumber && (
                    <div style={{ color: 'var(--error)', fontSize: '0.78rem', marginTop: '0.3rem', fontWeight: 600 }}>
                      ⚠️ {fieldErrors.passportNumber}
                    </div>
                  )}
                </div>

                <div style={{ paddingTop: '1.5rem' }}>
                  <button
                    type="button"
                    id="btn-verify-identity"
                    onClick={handleManualVerify}
                    className="btn btn-primary"
                    style={{
                      whiteSpace: 'nowrap',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      padding: '0.65rem 1.25rem'
                    }}
                  >
                    🔍 Verify & Search
                  </button>
                </div>
              </div>
            ) : (
              /* ── Identity Inputs: Foreign Resource Person Mode ── */
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto', gap: '1rem', alignItems: 'flex-start' }}>
                <div>
                  <label htmlFor="select-foreign-country" className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                    Citizenship / Country <span className="required" style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  {!isCustomCountry ? (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <select
                        id="select-foreign-country"
                        className="form-input"
                        value={selectedForeignCountry}
                        onChange={(e) => {
                          if (e.target.value === 'Other International') {
                            setIsCustomCountry(true);
                            setCustomCountryName('');
                            handleFieldChange('country', '');
                            handleFieldChange('citizenship', '');
                          } else {
                            setSelectedForeignCountry(e.target.value);
                            handleFieldChange('country', e.target.value);
                            handleFieldChange('citizenship', e.target.value);
                          }
                        }}
                        style={{ fontWeight: 600 }}
                      >
                        {POPULAR_COUNTRIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <input
                        id="input-custom-country"
                        type="text"
                        className="form-input"
                        placeholder="Type country name..."
                        value={customCountryName}
                        onChange={(e) => {
                          setCustomCountryName(e.target.value);
                          handleFieldChange('country', e.target.value);
                          handleFieldChange('citizenship', e.target.value);
                        }}
                        style={{ fontWeight: 600 }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomCountry(false);
                          setSelectedForeignCountry('India');
                          handleFieldChange('country', 'India');
                          handleFieldChange('citizenship', 'India');
                        }}
                        className="btn btn-ghost btn-sm"
                        title="Back to country list"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  {fieldErrors.country && (
                    <div style={{ color: 'var(--error)', fontSize: '0.78rem', marginTop: '0.3rem', fontWeight: 600 }}>
                      ⚠️ {fieldErrors.country}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="input-passport-foreign" className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                    Foreign Passport Number <span className="required" style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input
                    id="input-passport-foreign"
                    type="text"
                    className="form-input"
                    placeholder="e.g. GB98765432 / 987654321"
                    value={formData.passportNumber}
                    onChange={(e) => handleFieldChange('passportNumber', e.target.value.toUpperCase())}
                    style={{
                      borderColor: passportValidation ? (passportValidation.isValid ? 'var(--teal)' : 'var(--error)') : undefined,
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}
                  />
                  {passportValidation && (
                    <div style={{
                      marginTop: '0.4rem',
                      fontSize: '0.78rem',
                      color: passportValidation.isValid ? 'var(--teal-dark)' : 'var(--error)',
                      fontWeight: 600,
                      padding: '0.35rem 0.6rem',
                      background: passportValidation.isValid ? 'rgba(0, 83, 78, 0.06)' : 'rgba(211, 47, 47, 0.06)',
                      borderRadius: '6px'
                    }}>
                      {passportValidation.isValid ? '✓ Valid international passport format' : passportValidation.error}
                    </div>
                  )}
                  {fieldErrors.passportNumber && (
                    <div style={{ color: 'var(--error)', fontSize: '0.78rem', marginTop: '0.3rem', fontWeight: 600 }}>
                      ⚠️ {fieldErrors.passportNumber}
                    </div>
                  )}
                </div>

                <div style={{ paddingTop: '1.5rem' }}>
                  <button
                    type="button"
                    id="btn-verify-foreign-identity"
                    onClick={handleManualVerify}
                    className="btn btn-primary"
                    style={{
                      whiteSpace: 'nowrap',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      padding: '0.65rem 1.25rem'
                    }}
                  >
                    🔍 Verify & Search
                  </button>
                </div>
              </div>
            )}

            {/* ── Live Exact Duplicate Alert Card (Immediate Alert) ── */}
            {exactDuplicate && (
              <div style={{
                marginTop: '1.25rem',
                padding: '1.15rem 1.35rem',
                borderRadius: '8px',
                background: 'rgba(211, 47, 47, 0.08)',
                border: '1.5px solid var(--error)',
                color: 'var(--error)',
                animation: 'shake 0.2s ease-in-out'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.3rem' }}>🛑</span>
                    <strong style={{ fontSize: '0.96rem' }}>
                      Exact Registered Duplicate Found in Database!
                    </strong>
                  </div>
                  <span className="badge" style={{ background: 'var(--error)', color: '#fff', fontSize: '0.75rem' }}>
                    Duplicate Blocked
                  </span>
                </div>

                <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                  A resource person is <strong>ALREADY registered</strong> with this identity:
                </p>

                <div style={{
                  background: '#fff',
                  border: '1px solid var(--border-default)',
                  borderRadius: '6px',
                  padding: '0.85rem 1.15rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '0.6rem',
                  fontSize: '0.84rem',
                  color: 'var(--text-primary)'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>Full Name</span>
                    <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>{exactDuplicate.name}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>NIC / Passport</span>
                    <code style={{ fontWeight: 700 }}>{exactDuplicate.nic || exactDuplicate.passportNumber}</code>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>Workplace</span>
                    <span>{exactDuplicate.workplace || 'Ministry of Education'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>Designation</span>
                    <span>{exactDuplicate.position || 'Resource Person'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>Contact</span>
                    <span>{exactDuplicate.phone || 'N/A'} • {exactDuplicate.email || 'N/A'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.85rem' }}>
                  <Link href="/resource-persons" className="btn btn-secondary btn-sm" style={{ fontSize: '0.8rem' }}>
                    👥 View Existing Profile in Directory
                  </Link>
                </div>
              </div>
            )}

            {/* ── Manual Check Feedback Banner ── */}
            {manualCheckFeedback && !exactDuplicate && (
              <div style={{
                marginTop: '1.25rem',
                padding: '0.9rem 1.25rem',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: 600,
                background: manualCheckFeedback.type === 'clean' ? 'rgba(0, 83, 78, 0.08)' : 'rgba(235, 116, 0, 0.08)',
                border: `1.5px solid ${manualCheckFeedback.type === 'clean' ? 'var(--teal)' : 'var(--accent)'}`,
                color: manualCheckFeedback.type === 'clean' ? 'var(--teal-dark)' : '#B45309',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span>{manualCheckFeedback.type === 'clean' ? '✅' : '⚠️'}</span>
                <span>{manualCheckFeedback.text}</span>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              SECTION 2: FUZZY DUPLICATE REDUCTION (SIMILARITY DETECTION)
              ══════════════════════════════════════════════════════════════════ */}
          {potentialDuplicates.length > 0 && !exactDuplicate && (
            <div style={{
              background: '#FFFBEB',
              border: '1.5px solid #F59E0B',
              borderRadius: '10px',
              padding: '1.25rem 1.5rem',
              marginBottom: '2rem',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.12)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.3rem' }}>⚠️</span>
                  <h4 style={{ margin: 0, color: '#92400E', fontSize: '1rem', fontWeight: 800 }}>
                    Duplicate Prevention: {potentialDuplicates.length} Similar Registered Record(s) Detected
                  </h4>
                </div>
                <span style={{
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  background: '#FDE68A',
                  color: '#92400E',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '999px'
                }}>
                  Highest Match: {potentialDuplicates[0].score}%
                </span>
              </div>

              <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#78350F', lineHeight: 1.5 }}>
                The system detected existing registered resource person(s) with matching or similar Name, Phone, or Workplace. Review the side-by-side comparison below to prevent accidental duplicate entries.
              </p>

              {/* Side-by-Side Comparison Table */}
              <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '8px', border: '1px solid #FCD34D' }}>
                <table className="table" style={{ margin: 0, fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ background: '#FEF3C7', color: '#92400E' }}>
                      <th style={{ width: '22%' }}>Comparison Field</th>
                      <th style={{ width: '39%' }}>New Person Being Entered</th>
                      <th style={{ width: '39%' }}>Existing Registered Record</th>
                    </tr>
                  </thead>
                  <tbody>
                    {potentialDuplicates.slice(0, 2).map((match, idx) => (
                      <React.Fragment key={idx}>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Full Name</td>
                          <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formData.name || '(Not entered yet)'}</td>
                          <td style={{ fontWeight: 700, color: '#92400E' }}>{match.existingRecord.name}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>NIC / Passport</td>
                          <td><code>{formData.nic || formData.passportNumber || '(Not entered)'}</code></td>
                          <td><code>{match.existingRecord.nic || match.existingRecord.passportNumber || 'N/A'}</code></td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Workplace</td>
                          <td>{formData.workplace || '(Not entered)'}</td>
                          <td>{match.existingRecord.workplace || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Position / Role</td>
                          <td>{formData.position || '(Resource Person)'} ({formData.roleInWorkshop})</td>
                          <td>{match.existingRecord.position || 'Resource Person'}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Contact Info</td>
                          <td>{formData.phone || 'N/A'} • {formData.email || 'N/A'}</td>
                          <td>{match.existingRecord.phone || 'N/A'} • {match.existingRecord.email || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, color: '#92400E' }}>Match Indicators</td>
                          <td colSpan={2} style={{ background: '#FFFDF5' }}>
                            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#78350F' }}>
                              {match.reasons.map((r, rIdx) => (
                                <li key={rIdx}>{r}</li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Confirmation Checkbox for High Duplicate Similarity */}
              {potentialDuplicates[0].score >= 80 && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.85rem 1rem',
                  background: confirmDifferentPerson ? 'rgba(0, 83, 78, 0.08)' : '#FFF7ED',
                  border: `1.5px solid ${confirmDifferentPerson ? 'var(--teal)' : '#EA580C'}`,
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <input
                    type="checkbox"
                    id="chk-confirm-different"
                    checked={confirmDifferentPerson}
                    onChange={(e) => setConfirmDifferentPerson(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="chk-confirm-different" style={{ fontSize: '0.85rem', fontWeight: 700, color: confirmDifferentPerson ? 'var(--teal-dark)' : '#9A3412', cursor: 'pointer', margin: 0 }}>
                    I have verified the above record and confirm this is a DIFFERENT individual (Proceed with registration)
                  </label>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SECTION 3: COMPLETE RESOURCE PERSON PROFILE
              ══════════════════════════════════════════════════════════════════ */}
          <div className="card" style={{
            padding: '2rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
            marginBottom: '2rem'
          }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-light)' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>📋</span> 2. Resource Person Profile & Qualifications
                </h2>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                  Enter official credentials, institutional affiliation, contact details, and qualifications.
                </p>
              </div>
              <span className="badge badge-secondary" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                {formData.personType === 'local' ? '🇱🇰 Sri Lankan National' : `🌐 Foreign (${formData.country})`}
              </span>
            </div>

            {/* Optional Workshop Link */}
            <div style={{
              background: 'rgba(141, 21, 58, 0.04)',
              border: '1px dashed var(--primary-light)',
              borderRadius: '8px',
              padding: '1.15rem 1.25rem',
              marginBottom: '1.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🏛️</span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary)' }}>
                  Workshop Assignment (Optional)
                </span>
                <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                  No Workshop Required
                </span>
              </div>
              <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                You can register resource persons independently to build the national verified roster. If already assigned to an active workshop, select it below; otherwise leave as <strong>General Resource Pool</strong>.
              </p>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <select
                  id="select-workshop"
                  className="form-input"
                  value={formData.workshopId}
                  onChange={(e) => handleFieldChange('workshopId', e.target.value)}
                  style={{ background: '#fff', fontWeight: 500 }}
                >
                  <option value="">
                    ⭐ None — Register directly to Master Resource Pool (Without Workshop)
                  </option>
                  {workshops.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      📌 {ws.workshopNumber} — {ws.title} ({ws.subject} | {ws.placeName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Profile Fields */}
            <div className="form-row" style={{ marginBottom: '1.25rem' }}>
              <div className="form-group" style={{ marginBottom: 0, flex: 0.8 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Serial Number <span style={{ fontSize: '0.72rem', color: 'var(--teal)', fontWeight: 600 }}>● Auto-assigned</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={`#${formData.serialNumber}`}
                  readOnly
                  style={{ background: 'var(--bg-light)', fontWeight: 700, color: 'var(--primary)', cursor: 'default' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0, flex: 2.2 }}>
                <label htmlFor="input-fullname" className="form-label" style={{ fontWeight: 700 }}>
                  Full Name with Initials / Title <span className="required" style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input
                  id="input-fullname"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Prof. Ajith Madurapperuma / Dr. Buddhini Samarasinghe"
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  style={{
                    borderColor: fieldErrors.name ? 'var(--error)' : undefined,
                    fontWeight: 600,
                    fontSize: '0.95rem'
                  }}
                />
                {fieldErrors.name && (
                  <div style={{ color: 'var(--error)', fontSize: '0.78rem', marginTop: '0.25rem', fontWeight: 600 }}>
                    ⚠️ {fieldErrors.name}
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: 0, flex: 1.2 }}>
                <label htmlFor="select-role" className="form-label" style={{ fontWeight: 600 }}>
                  Role / Facilitation Level
                </label>
                <select
                  id="select-role"
                  className="form-input"
                  value={formData.roleInWorkshop}
                  onChange={(e) => handleFieldChange('roleInWorkshop', e.target.value)}
                  style={{ fontWeight: 600 }}
                >
                  <option value="Lead Facilitator">Lead Facilitator</option>
                  <option value="Co-Facilitator">Co-Facilitator</option>
                  <option value="Master Trainer">Master Trainer</option>
                  <option value="Subject Expert">Subject Expert</option>
                  <option value="Technical Consultant">Technical Consultant</option>
                  <option value="Guest Speaker">Guest Speaker</option>
                </select>
              </div>
            </div>

            {/* Position and Workplace */}
            <div className="form-row" style={{ marginBottom: '1.25rem' }}>
              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label htmlFor="input-position" className="form-label" style={{ fontWeight: 600 }}>
                  Current Position / Designation <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>(Defaults to 'Resource Person')</span>
                </label>
                <input
                  id="input-position"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Senior Lecturer, Director, Master Trainer, In-Service Advisor"
                  value={formData.position}
                  onChange={(e) => handleFieldChange('position', e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label htmlFor="input-workplace" className="form-label" style={{ fontWeight: 600 }}>
                  Workplace / Institute / School <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>(Defaults to 'Ministry of Education')</span>
                </label>
                <input
                  id="input-workplace"
                  type="text"
                  className="form-input"
                  placeholder="e.g. University of Ruhuna, NIE, Galle Zone IT Branch, MOE"
                  value={formData.workplace}
                  onChange={(e) => handleFieldChange('workplace', e.target.value)}
                />
              </div>
            </div>

            {/* Contact Details */}
            <div className="form-row" style={{ marginBottom: '1.25rem' }}>
              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label htmlFor="input-phone" className="form-label" style={{ fontWeight: 600 }}>
                  Telephone / Mobile Number
                </label>
                <input
                  id="input-phone"
                  type="tel"
                  className="form-input"
                  placeholder="e.g. 0771234567 / +94771234567"
                  value={formData.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  style={{ borderColor: fieldErrors.phone ? 'var(--error)' : undefined }}
                />
                {fieldErrors.phone && (
                  <div style={{ color: 'var(--error)', fontSize: '0.78rem', marginTop: '0.25rem', fontWeight: 600 }}>
                    ⚠️ {fieldErrors.phone}
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label htmlFor="input-email" className="form-label" style={{ fontWeight: 600 }}>
                  Email Address
                </label>
                <input
                  id="input-email"
                  type="email"
                  className="form-input"
                  placeholder="e.g. ajith@ruh.ac.lk / resource@moe.gov.lk"
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  style={{ borderColor: fieldErrors.email ? 'var(--error)' : undefined }}
                />
                {fieldErrors.email && (
                  <div style={{ color: 'var(--error)', fontSize: '0.78rem', marginTop: '0.25rem', fontWeight: 600 }}>
                    ⚠️ {fieldErrors.email}
                  </div>
                )}
              </div>
            </div>

            {/* Service & Grade */}
            <div className="form-row" style={{ marginBottom: '1.25rem' }}>
              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label htmlFor="input-service" className="form-label" style={{ fontWeight: 600 }}>
                  Service Relevant to Position
                </label>
                <input
                  id="input-service"
                  type="text"
                  className="form-input"
                  placeholder="e.g. SLEAS / SLTS / SLTES / University Academic"
                  value={formData.service}
                  onChange={(e) => handleFieldChange('service', e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label htmlFor="input-grade" className="form-label" style={{ fontWeight: 600 }}>
                  Grade Relevant to Position
                </label>
                <input
                  id="input-grade"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Grade I / Grade II / Special Grade / Senior Professor"
                  value={formData.grade}
                  onChange={(e) => handleFieldChange('grade', e.target.value)}
                />
              </div>
            </div>

            {/* Residential Address */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="input-address" className="form-label" style={{ fontWeight: 600 }}>
                Personal Residential / Professional Address
              </label>
              <input
                id="input-address"
                type="text"
                className="form-input"
                placeholder="e.g. No. 45, High Level Road, Maharagama"
                value={formData.personalAddress}
                onChange={(e) => handleFieldChange('personalAddress', e.target.value)}
              />
            </div>

            {/* Qualifications */}
            <div style={{ height: '1px', background: 'var(--border-light)', margin: '1.5rem 0' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🎓</span> 3. Qualifications & Specializations
            </h3>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="textarea-educational" className="form-label" style={{ fontWeight: 600 }}>
                Educational & Professional Qualifications
              </label>
              <textarea
                id="textarea-educational"
                className="form-textarea"
                rows={2}
                placeholder="e.g. Ph.D. in Computer Science, B.Sc (Hons) in Computing, PGDE, IEEE Senior Member"
                value={formData.educationalQualifications}
                onChange={(e) => handleFieldChange('educationalQualifications', e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="textarea-subject" className="form-label" style={{ fontWeight: 600 }}>
                Subject Specific Qualifications & Key Competencies
              </label>
              <textarea
                id="textarea-subject"
                className="form-textarea"
                rows={2}
                placeholder="e.g. Python Programming, Cloud Architecture, STEM Pedagogy, Machine Learning"
                value={formData.subjectQualifications}
                onChange={(e) => handleFieldChange('subjectQualifications', e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="textarea-notes" className="form-label" style={{ fontWeight: 600 }}>
                Special Notes / Facilitator Remarks
              </label>
              <textarea
                id="textarea-notes"
                className="form-textarea"
                rows={2}
                placeholder="Any special remarks, preferred availability, session topics, or equipment requirements..."
                value={formData.specialNotes}
                onChange={(e) => handleFieldChange('specialNotes', e.target.value)}
              />
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                ACTION ERROR ALERT BANNER (DIRECTLY ABOVE SUBMIT BUTTON)
                ══════════════════════════════════════════════════════════════════ */}
            <div ref={errorAlertRef}>
              {(errorList.length > 0 || serverError) && (
                <div style={{
                  background: 'rgba(211, 47, 47, 0.08)',
                  border: '2px solid var(--error)',
                  borderRadius: '10px',
                  padding: '1.25rem 1.5rem',
                  marginBottom: '1.5rem',
                  color: 'var(--error)',
                  animation: 'fadeIn 0.2s ease-in-out'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.3rem' }}>⚠️</span>
                    <strong style={{ fontSize: '1rem', color: 'var(--error)' }}>
                      Cannot Save Resource Person — Please Review Highlighted Errors:
                    </strong>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.88rem', lineHeight: 1.6, color: '#B91C1C' }}>
                    {errorList.map((err, idx) => (
                      <li key={idx}><strong>{err}</strong></li>
                    ))}
                    {serverError && !errorList.includes(serverError) && (
                      <li><strong>{serverError}</strong></li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* ── Form Actions Bar ── */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--border-light)',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <Link href="/resource-persons" className="btn btn-secondary">
                Cancel
              </Link>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  type="submit"
                  id="btn-save-resource-person"
                  className="btn btn-primary"
                  disabled={saving || (exactDuplicate !== null)}
                  style={{
                    padding: '0.75rem 2rem',
                    fontSize: '0.98rem',
                    fontWeight: 700,
                    boxShadow: exactDuplicate ? 'none' : '0 4px 14px rgba(141, 21, 58, 0.28)',
                    background: exactDuplicate ? 'var(--gray-400)' : saving ? 'var(--primary-dark)' : 'var(--primary)',
                    cursor: exactDuplicate ? 'not-allowed' : saving ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{
                        display: 'inline-block',
                        width: '1rem',
                        height: '1rem',
                        border: '2px solid #fff',
                        borderRightColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.75s linear infinite'
                      }}></span>
                      <span>Validating & Registering Resource Person...</span>
                    </>
                  ) : exactDuplicate ? (
                    <span>🛑 Duplicate Identity Detected — Cannot Register</span>
                  ) : (
                    <span>💾 Save & Register Resource Person</span>
                  )}
                </button>
              </div>
            </div>

          </div>
        </form>

      </div>
    </AppShell>
  );
}
