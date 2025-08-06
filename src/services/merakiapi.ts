// src/services/merakiapi.ts - Meraki API Service Layer
import { APIError, MerakiError } from "../errors";
import type {
	Client,
	Device,
	DeviceStatus,
	ManagementInterface,
	Network,
	NetworkEvent,
	NetworkTraffic,
	Organization,
	SwitchPort,
	SwitchPortStatus,
	SwitchRoutingInterface,
	SwitchStaticRoute,
	WirelessLatencyStats,
	WirelessRadioSettings,
	WirelessStatus,
} from "../types/meraki";

export class MerakiAPIService {
	private apiKey: string;
	private baseUrl: string;

	constructor(apiKey: string, baseUrl = "https://api.meraki.com/api/v1") {
		if (!apiKey) {
			throw new MerakiError("MERAKI_API_KEY is required");
		}
		this.apiKey = apiKey;
		this.baseUrl = baseUrl;
	}

	private async makeRequest<T>(
		endpoint: string,
		options: RequestInit = {},
	): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`;
		const headers = {
			"X-Cisco-Meraki-API-Key": this.apiKey,
			"Content-Type": "application/json",
			...options.headers,
		};

		try {
			const response = await fetch(url, {
				...options,
				headers,
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new APIError(
					`Meraki API Error: ${response.status} ${response.statusText}`,
					response.status,
					errorText,
				);
			}

			return (await response.json()) as T;
		} catch (error) {
			if (error instanceof APIError) {
				throw error;
			}
			throw new MerakiError(
				`Network request failed for ${endpoint}: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	// Organizations
	async getOrganizations(): Promise<Organization[]> {
		return this.makeRequest<Organization[]>("/organizations");
	}

	async getOrganization(organizationId: string): Promise<Organization> {
		return this.makeRequest<Organization>(`/organizations/${organizationId}`);
	}

	// Networks
	async getNetworks(organizationId: string): Promise<Network[]> {
		return this.makeRequest<Network[]>(
			`/organizations/${organizationId}/networks`,
		);
	}

	async getNetwork(networkId: string): Promise<Network> {
		return this.makeRequest<Network>(`/networks/${networkId}`);
	}

	// Devices
	async getDevices(networkId: string): Promise<Device[]> {
		return this.makeRequest<Device[]>(`/networks/${networkId}/devices`);
	}

	async getDevice(serial: string): Promise<Device> {
		return this.makeRequest<Device>(`/devices/${serial}`);
	}

	async getDeviceStatuses(organizationId: string): Promise<DeviceStatus[]> {
		return this.makeRequest<DeviceStatus[]>(
			`/organizations/${organizationId}/devices/statuses`,
		);
	}

	// Clients
	async getClients(networkId: string, timespan = 86400): Promise<Client[]> {
		return this.makeRequest<Client[]>(
			`/networks/${networkId}/clients?timespan=${timespan}`,
		);
	}

	// Switch Ports
	async getSwitchPorts(serial: string): Promise<SwitchPort[]> {
		return this.makeRequest<SwitchPort[]>(`/devices/${serial}/switch/ports`);
	}

	async getSwitchPortStatuses(
		serial: string,
		timespan = 300,
	): Promise<SwitchPortStatus[]> {
		return this.makeRequest<SwitchPortStatus[]>(
			`/devices/${serial}/switch/ports/statuses?timespan=${timespan}`,
		);
	}

	// Device Management Interface
	async getManagementInterface(serial: string): Promise<ManagementInterface> {
		return this.makeRequest<ManagementInterface>(
			`/devices/${serial}/managementInterface`,
		);
	}

	// Wireless Access Point Methods
	async getWirelessRadioSettings(
		serial: string,
	): Promise<WirelessRadioSettings> {
		return this.makeRequest<WirelessRadioSettings>(
			`/devices/${serial}/wireless/radio/settings`,
		);
	}

	async getWirelessStatus(serial: string): Promise<WirelessStatus> {
		return this.makeRequest<WirelessStatus>(
			`/devices/${serial}/wireless/status`,
		);
	}

	async getWirelessLatencyStats(
		serial: string,
		timespan = 86400,
	): Promise<WirelessLatencyStats> {
		return this.makeRequest<WirelessLatencyStats>(
			`/devices/${serial}/wireless/latencyStats?timespan=${timespan}`,
		);
	}

	// Switch Routing
	async getSwitchRoutingInterfaces(
		serial: string,
	): Promise<SwitchRoutingInterface[]> {
		return this.makeRequest<SwitchRoutingInterface[]>(
			`/devices/${serial}/switch/routing/interfaces`,
		);
	}

	async getSwitchStaticRoutes(serial: string): Promise<SwitchStaticRoute[]> {
		return this.makeRequest<SwitchStaticRoute[]>(
			`/devices/${serial}/switch/routing/staticRoutes`,
		);
	}

	// Network Traffic and Performance
	async getNetworkTraffic(
		networkId: string,
		timespan = 86400,
	): Promise<NetworkTraffic[]> {
		return this.makeRequest<NetworkTraffic[]>(
			`/networks/${networkId}/traffic?timespan=${timespan}`,
		);
	}

	async getNetworkEvents(
		networkId: string,
		perPage = 10,
	): Promise<NetworkEvent[]> {
		return this.makeRequest<NetworkEvent[]>(
			`/networks/${networkId}/events?perPage=${perPage}`,
		);
	}
}
