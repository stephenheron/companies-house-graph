import { createServerFn } from '@tanstack/react-start'

export interface Officer {
  title: string
  description: string
  appointment_count: number
  address_snippet: string
  date_of_birth?: { month: number; year: number }
  links?: { self: string }
}

interface OfficerSearchResult {
  items: Officer[]
  total_results: number
}

export interface Appointment {
  appointed_on?: string
  resigned_on?: string
  officer_role: string
  name: string
  occupation?: string
  nationality?: string
  appointed_to: {
    company_name?: string
    company_number: string
    company_status?: string
  }
  address?: {
    address_line_1?: string
    address_line_2?: string
    locality?: string
    postal_code?: string
    region?: string
    country?: string
    premises?: string
  }
}

export interface AppointmentList {
  name: string
  total_results: number
  items: Appointment[]
}

function getApiKey() {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY
  if (!apiKey) {
    throw new Error('COMPANIES_HOUSE_API_KEY is not set')
  }
  return apiKey
}

function authHeaders() {
  return {
    Authorization: `Basic ${btoa(getApiKey() + ':')}`,
  }
}

export const searchOfficers = createServerFn({ method: 'GET' })
  .inputValidator((query: string) => query)
  .handler(async ({ data: query }): Promise<OfficerSearchResult> => {
    const url = new URL('https://api.company-information.service.gov.uk/search/officers')
    url.searchParams.set('q', query)
    url.searchParams.set('items_per_page', '10')

    const res = await fetch(url.toString(), { headers: authHeaders() })

    if (!res.ok) {
      throw new Error(`Companies House API error: ${res.status}`)
    }

    return res.json()
  })

export const getOfficerAppointments = createServerFn({ method: 'GET' })
  .inputValidator((officerId: string) => officerId)
  .handler(async ({ data: officerId }): Promise<AppointmentList> => {
    const url = `https://api.company-information.service.gov.uk/officers/${officerId}/appointments`

    const res = await fetch(url, { headers: authHeaders() })

    if (!res.ok) {
      throw new Error(`Companies House API error: ${res.status}`)
    }

    return res.json()
  })

export interface CompanyOfficer {
  name: string
  officer_role: string
  appointed_on?: string
  resigned_on?: string
  occupation?: string
  nationality?: string
  links: {
    officer: {
      appointments: string
    }
  }
}

export interface CompanyOfficerList {
  items: CompanyOfficer[]
  total_results: number
}

export const getCompanyOfficers = createServerFn({ method: 'GET' })
  .inputValidator((companyNumber: string) => companyNumber)
  .handler(async ({ data: companyNumber }): Promise<CompanyOfficerList> => {
    const url = new URL(`https://api.company-information.service.gov.uk/company/${companyNumber}/officers`)
    url.searchParams.set('items_per_page', '20')

    const res = await fetch(url.toString(), { headers: authHeaders() })

    if (!res.ok) {
      throw new Error(`Companies House API error: ${res.status}`)
    }

    return res.json()
  })
