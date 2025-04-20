import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { locationRatesApi, locationsApi } from '@/lib/api';
import { Location, LocationRate } from '@/lib/types';

// Debug logging
console.log('locationRatesApi:', locationRatesApi);
console.log('typeof locationRatesApi:', typeof locationRatesApi);
console.log('locationRatesApi.getRates:', locationRatesApi.getRates);

export const LocationRates: React.FC = () => {
  const { user } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [rates, setRates] = useState<LocationRate[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [selectedPassType, setSelectedPassType] = useState('');
  const [baseRate, setBaseRate] = useState('');
  const [eveningRate, setEveningRate] = useState('');
  const [nightRate, setNightRate] = useState('');
  const [weekendRate, setWeekendRate] = useState('');
  const [holidayRate, setHolidayRate] = useState('');
  const [newYearsEveRate, setNewYearsEveRate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Add useEffect to calculate rates when base rate changes
  useEffect(() => {
    if (baseRate) {
      const base = parseFloat(baseRate);
      if (!isNaN(base)) {
        setEveningRate((base * 1.1).toFixed(2));
        setNightRate((base * 1.2).toFixed(2));
        setWeekendRate((base * 1.35).toFixed(2));
        setHolidayRate((base * 1.5).toFixed(2));
        setNewYearsEveRate((base * 2).toFixed(2));
      }
    }
  }, [baseRate]);

  useEffect(() => {
    if (user?.roles.includes('admin')) {
      fetchLocations();
      fetchRates();
    }
  }, [user]);

  const fetchLocations = async () => {
    try {
      const data = await locationsApi.getAll();
      setLocations(data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchRates = async () => {
    try {
      const data = await locationRatesApi.getAll();
      setRates(data);
      setValidationErrors([]);
    } catch (error: any) {
      console.error('Error fetching rates:', error);
      
      if (error.response?.status === 401) {
        // Unauthorized - redirect to login
        window.location.href = '/login';
        return;
      }
      
      if (error.response?.status === 403) {
        // Forbidden - user doesn't have required role
        setValidationErrors(['You do not have permission to view location rates']);
        return;
      }
      
      if (error.response?.status === 422) {
        // Validation error
        const errorData = error.response.data;
        if (Array.isArray(errorData.detail)) {
          setValidationErrors(errorData.detail.map((err: any) => err.msg || err));
        } else if (typeof errorData.detail === 'string') {
          setValidationErrors([errorData.detail]);
        } else if (errorData.detail) {
          setValidationErrors([JSON.stringify(errorData.detail)]);
        } else {
          setValidationErrors(['Invalid data received from server']);
        }
        return;
      }
      
      // Handle other errors
      if (error.message) {
        try {
          const errorObj = JSON.parse(error.message);
          if (Array.isArray(errorObj)) {
            setValidationErrors(errorObj.map(err => err.msg || err));
          } else if (typeof errorObj === 'string') {
            setValidationErrors([errorObj]);
          } else {
            setValidationErrors([JSON.stringify(errorObj)]);
          }
        } catch (e) {
          setValidationErrors([error.message]);
        }
      } else {
        setValidationErrors(['An unexpected error occurred']);
      }
    }
  };

  // Add debug logging for the rates state
  useEffect(() => {
    console.log('Current rates state:', rates);
  }, [rates]);

  // Add debug logging for the locations state
  useEffect(() => {
    console.log('Current locations state:', locations);
  }, [locations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation || !selectedPassType) return;

    try {
      const newRate = await locationRatesApi.create({
        location_id: selectedLocation,
        pass_type: selectedPassType,
        base_rate: parseFloat(baseRate),
        evening_rate: parseFloat(eveningRate),
        night_rate: parseFloat(nightRate),
        weekend_rate: parseFloat(weekendRate),
        holiday_rate: parseFloat(holidayRate),
        new_years_eve_rate: parseFloat(newYearsEveRate),
      });

      setRates([...rates, newRate]);
      
      // Reset form
      setSelectedLocation(null);
      setSelectedPassType('');
      setBaseRate('');
      setEveningRate('');
      setNightRate('');
      setWeekendRate('');
      setHolidayRate('');
      setNewYearsEveRate('');
    } catch (error) {
      console.error('Error creating rate:', error);
    }
  };

  const handleDelete = async (rateId: number) => {
    try {
      await locationRatesApi.delete(rateId);
      setRates(rates.filter(rate => rate.id !== rateId));
    } catch (error) {
      console.error('Error deleting rate:', error);
    }
  };

  if (!user) {
    return <div>Please log in to access this page.</div>;
  }

  if (!user.roles.includes('admin')) {
    return <div>Access denied. Admin privileges required.</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Location Rates Management</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <h3 className="font-bold">Validation Errors:</h3>
          <ul className="list-disc list-inside">
            {validationErrors.map((err, index) => (
              <li key={index}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <select
              value={selectedLocation || ''}
              onChange={(e) => setSelectedLocation(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            >
              <option value="">Select a location</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.naam}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Pass Type</label>
            <select
              value={selectedPassType}
              onChange={(e) => setSelectedPassType(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            >
              <option value="">Select a pass type</option>
              <option value="regular">Regular</option>
              <option value="premium">Premium</option>
              <option value="vip">VIP</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Base Rate</label>
            <input
              type="number"
              step="0.01"
              value={baseRate}
              onChange={(e) => setBaseRate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Evening Rate</label>
            <input
              type="number"
              step="0.01"
              value={eveningRate}
              onChange={(e) => setEveningRate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Night Rate</label>
            <input
              type="number"
              step="0.01"
              value={nightRate}
              onChange={(e) => setNightRate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Weekend Rate</label>
            <input
              type="number"
              step="0.01"
              value={weekendRate}
              onChange={(e) => setWeekendRate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Holiday Rate</label>
            <input
              type="number"
              step="0.01"
              value={holidayRate}
              onChange={(e) => setHolidayRate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">New Year's Eve Rate</label>
            <input
              type="number"
              step="0.01"
              value={newYearsEveRate}
              onChange={(e) => setNewYearsEveRate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Add Rate
          </button>
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr>
              <th className="px-4 py-2 border">Location</th>
              <th className="px-4 py-2 border">Pass Type</th>
              <th className="px-4 py-2 border">Base Rate</th>
              <th className="px-4 py-2 border">Evening Rate</th>
              <th className="px-4 py-2 border">Night Rate</th>
              <th className="px-4 py-2 border">Weekend Rate</th>
              <th className="px-4 py-2 border">Holiday Rate</th>
              <th className="px-4 py-2 border">New Year's Eve Rate</th>
              <th className="px-4 py-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rates.map(rate => (
              <tr key={rate.id}>
                <td className="px-4 py-2 border">
                  {locations.find(l => l.id === rate.location_id)?.naam}
                </td>
                <td className="px-4 py-2 border">{rate.pass_type}</td>
                <td className="px-4 py-2 border">{rate.base_rate}</td>
                <td className="px-4 py-2 border">{rate.evening_rate}</td>
                <td className="px-4 py-2 border">{rate.night_rate}</td>
                <td className="px-4 py-2 border">{rate.weekend_rate}</td>
                <td className="px-4 py-2 border">{rate.holiday_rate}</td>
                <td className="px-4 py-2 border">{rate.new_years_eve_rate}</td>
                <td className="px-4 py-2 border">
                  <button
                    onClick={() => handleDelete(rate.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 