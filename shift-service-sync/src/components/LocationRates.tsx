import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { locationRatesApi, locationsApi } from '@/lib/api';
import { Location, LocationRate } from '@/lib/types';

const roundToTwoDecimals = (num: number): number => {
  return Math.round(num * 100) / 100;
};

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
        setEveningRate(roundToTwoDecimals(base * 1.1).toFixed(2));
        setNightRate(roundToTwoDecimals(base * 1.2).toFixed(2));
        setWeekendRate(roundToTwoDecimals(base * 1.35).toFixed(2));
        setHolidayRate(roundToTwoDecimals(base * 1.5).toFixed(2));
        setNewYearsEveRate(roundToTwoDecimals(base * 2).toFixed(2));
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
    setError(null);
    setValidationErrors([]);

    // Validate required fields
    if (!selectedLocation || !selectedPassType) {
      setValidationErrors(['Please select both location and pass type']);
      return;
    }

    // Validate numeric fields
    const numericFields = {
      baseRate,
      eveningRate,
      nightRate,
      weekendRate,
      holidayRate,
      newYearsEveRate
    };

    const invalidFields = Object.entries(numericFields)
      .filter(([_, value]) => isNaN(parseFloat(value)) || parseFloat(value) <= 0)
      .map(([field]) => field.replace(/([A-Z])/g, ' $1').toLowerCase());

    if (invalidFields.length > 0) {
      setValidationErrors([
        `Please enter valid numbers greater than 0 for: ${invalidFields.join(', ')}`
      ]);
      return;
    }

    try {
      const base = parseFloat(baseRate);
      const rateData = {
        location_id: selectedLocation,
        pass_type: selectedPassType.toLowerCase(), // Ensure lowercase
        base_rate: base,
        evening_rate: roundToTwoDecimals(base * 1.1),
        night_rate: roundToTwoDecimals(base * 1.2),
        weekend_rate: roundToTwoDecimals(base * 1.35),
        holiday_rate: roundToTwoDecimals(base * 1.5),
        new_years_eve_rate: roundToTwoDecimals(base * 2),
      };

      console.log('Submitting rate data:', JSON.stringify(rateData, null, 2));

      const newRate = await locationRatesApi.create(rateData);
      console.log('Created new rate:', newRate);

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
    } catch (error: any) {
      console.error('Error creating rate:', error);
      
      // Extract error message
      let errorMessage = 'Failed to create location rate';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      
      // If there are validation errors, add them to the list
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        if (typeof errors === 'object') {
          setValidationErrors(Object.values(errors));
        } else if (Array.isArray(errors)) {
          setValidationErrors(errors);
        } else if (typeof errors === 'string') {
          setValidationErrors([errors]);
        }
      } else if (error.response?.data?.detail) {
        // If we have a detail message, add it to validation errors
        setValidationErrors([error.response.data.detail]);
      }
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
              <option value="blue">Blue Pass</option>
              <option value="grey">Grey Pass</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Base Rate (€/hour)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={baseRate}
              onChange={(e) => setBaseRate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Evening Rate (€/hour)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={eveningRate}
              onChange={(e) => setEveningRate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Night Rate (€/hour)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={nightRate}
              onChange={(e) => setNightRate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Weekend Rate (€/hour)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={weekendRate}
              onChange={(e) => setWeekendRate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Holiday Rate (€/hour)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={holidayRate}
              onChange={(e) => setHolidayRate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">New Year's Eve Rate (€/hour)</label>
            <input
              type="number"
              step="0.01"
              min="0"
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
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create Rate
          </button>
        </div>
      </form>

      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Current Rates</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pass Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Evening Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Night Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weekend Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Holiday Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">New Year's Eve Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rates.map((rate) => (
                <tr key={rate.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rate.location?.naam || 'Unknown Location'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rate.pass_type === 'blue' ? 'Blue Pass' : 'Grey Pass'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">€{rate.base_rate.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">€{rate.evening_rate.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">€{rate.night_rate.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">€{rate.weekend_rate.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">€{rate.holiday_rate.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">€{rate.new_years_eve_rate.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => handleDelete(rate.id)}
                      className="text-red-600 hover:text-red-900"
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
    </div>
  );
}; 