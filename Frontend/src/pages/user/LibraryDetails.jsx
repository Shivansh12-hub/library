import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function LibraryDetails() {
  const { libraryId } = useParams();
  const { user } = useAuth();

  const [library, setLibrary] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Review form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [submittingReview, setSubmittingReview] = useState(false);

  const availableTags = [
    'Silent Zone',
    'High-Speed Wi-Fi',
    'Ergonomic Chairs',
    'Cold AC',
    'Power Sockets Available',
  ];

  const fetchLibraryAndReviews = async () => {
    try {
      setLoading(true);
      const [libRes, revRes] = await Promise.all([
        api.get(`/user/libraries/${libraryId}`),
        api.get(`/user/libraries/${libraryId}/reviews`).catch(() => ({ data: { data: [] } })),
      ]);

      setLibrary(libRes.data.data);
      setReviews(revRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load library details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibraryAndReviews();
  }, [libraryId]);

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setSubmittingReview(true);
    try {
      const res = await api.post(`/user/libraries/${libraryId}/reviews`, {
        rating,
        comment,
        tags: selectedTags,
      });

      // Hydrate user name locally so the post renders immediately without refresh
      const createdReview = {
        ...res.data.data,
        user: { name: user?.name || 'Verified Student' },
        createdAt: new Date().toISOString(),
      };

      setReviews((prev) => [createdReview, ...prev]);
      setComment('');
      setRating(5);
      setSelectedTags([]);
      alert('Review posted successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return <div style={{ padding: '24px' }}>Loading library details...</div>;
  if (error || !library) {
    return <div style={{ padding: '24px', color: '#ef4444' }}>{error || 'Library not found.'}</div>;
  }

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length).toFixed(1)
      : 'New';

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${library.name}, ${library.address?.street}, ${library.address?.city}`
  )}`;

  return (
    <div style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Header & Quick Booking Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '26px' }}>{library.name}</h1>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 'bold',
                background: '#fef3c7',
                color: '#92400e',
                padding: '3px 8px',
                borderRadius: '6px',
              }}
            >
              ★ {avgRating} ({reviews.length})
            </span>
          </div>
          <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            📍 {library.address?.street}, {library.address?.locality}, {library.address?.city} -{' '}
            {library.address?.pincode}
          </p>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              marginTop: '6px',
              fontSize: '12px',
              color: '#2563eb',
              textDecoration: 'underline',
            }}
          >
            Open in Google Maps ↗
          </a>
        </div>
        <Link
          to={`/library/${library._id}/book`}
          style={{
            padding: '12px 24px',
            background: '#2563eb',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '15px',
          }}
        >
          Select Desk & Reserve
        </Link>
      </div>

      {/* 2. Photo Gallery */}
      <div>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Facility Gallery</h3>
        {library.photos && library.photos.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '12px',
            }}
          >
            {library.photos.map((imgUrl, idx) => (
              <img
                key={idx}
                src={imgUrl}
                alt={`${library.name} photo ${idx + 1}`}
                style={{
                  width: '100%',
                  height: '180px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              />
            ))}
          </div>
        ) : (
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            No photos uploaded for this property yet.
          </p>
        )}
      </div>

      {/* 3. Description & Amenities */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div
          style={{
            padding: '16px',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>About this Library</h3>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#334155' }}>
            {library.description ||
              'Dedicated study environment built for focused exam preparation.'}
          </p>
        </div>

        <div
          style={{
            padding: '16px',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Included Facilities</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {library.amenities?.map((amenity) => (
              <span
                key={amenity}
                style={{
                  fontSize: '12px',
                  background: '#e0f2fe',
                  color: '#0369a1',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontWeight: '500',
                }}
              >
                ✓ {amenity.replace('_', ' ').toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Shift Tiers & Pricing Breakdown */}
      <div>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Available Shifts & Pricing</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
          }}
        >
          {library.shifts?.map((shift) => (
            <div
              key={shift._id}
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '14px',
                background: '#fff',
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{shift.name}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                🕒 {shift.startTime} – {shift.endTime}
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#16a34a',
                  marginTop: '10px',
                }}
              >
                ₹{shift.price}{' '}
                <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#64748b' }}>
                  / month
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Code of Conduct */}
      {library.rules && library.rules.length > 0 && (
        <div
          style={{
            padding: '16px',
            background: '#fffbeb',
            borderRadius: '8px',
            border: '1px solid #fef3c7',
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#92400e' }}>
            Code of Conduct
          </h3>
          <ul
            style={{
              margin: 0,
              paddingLeft: '20px',
              fontSize: '13px',
              color: '#78350f',
              lineHeight: '1.8',
            }}
          >
            {library.rules.map((rule, idx) => (
              <li key={idx}>{rule}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 6. Reviews & Ratings Section */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Student Reviews & Feedback</h3>

        {/* Add Review Form */}
        <form
          onSubmit={handleAddReview}
          style={{
            marginBottom: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxWidth: '600px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Rating:</label>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            >
              <option value={5}>⭐⭐⭐⭐⭐ (5/5)</option>
              <option value={4}>⭐⭐⭐⭐ (4/5)</option>
              <option value={3}>⭐⭐⭐ (3/5)</option>
              <option value={2}>⭐⭐ (2/5)</option>
              <option value={1}>⭐ (1/5)</option>
            </select>
          </div>

          {/* Quick feedback tags */}
          <div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
              Select Tags:
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {availableTags.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      borderRadius: '12px',
                      border: active ? '1px solid #2563eb' : '1px solid #cbd5e1',
                      background: active ? '#eff6ff' : '#fff',
                      color: active ? '#1d4ed8' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    {active ? '✓ ' : '+ '}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <textarea
            rows={3}
            placeholder="Share your experience (ambient noise, air conditioning comfort, Wi-Fi stability)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              boxSizing: 'border-box',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
            }}
            required
          />

          <button
            type="submit"
            disabled={submittingReview}
            style={{
              alignSelf: 'flex-start',
              padding: '8px 16px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            {submittingReview ? 'Submitting...' : 'Post Review'}
          </button>
        </form>

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            No reviews yet. Be the first to leave one!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {reviews.map((rev) => (
              <div
                key={rev._id || Math.random()}
                style={{
                  padding: '14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  background: '#f8fafc',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '4px',
                  }}
                >
                  <strong>{rev.user?.name || 'Verified Student'}</strong>
                  <span style={{ color: '#f59e0b' }}>{'★'.repeat(rev.rating || 5)}</span>
                </div>

                {rev.tags && rev.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', margin: '4px 0 8px 0', flexWrap: 'wrap' }}>
                    {rev.tags.map((t, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '10px',
                          background: '#f1f5f9',
                          color: '#475569',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#334155' }}>
                  {rev.comment}
                </p>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                  {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : 'Just now'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}